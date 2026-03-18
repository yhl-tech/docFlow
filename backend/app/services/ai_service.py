"""
AI 服务层（Qwen / DeepSeek）
支持流式 SSE 响应
"""

import asyncio
import json
from typing import AsyncGenerator, Optional

import httpx
from loguru import logger

from app.config import settings


class AIServiceError(Exception):
    """AI 服务错误"""


REWRITE_PROMPTS: dict[str, str] = {
    '改写':              "请对以下文本进行改写，保持原意但使用不同的表达方式，直接输出结果，不要任何解释：\n\n{text}",
    '扩写':              "请对以下文本进行扩写，适当增加内容使其更丰富，直接输出结果，不要任何解释：\n\n{text}",
    '扩写_简单扩写':     "请对以下文本进行简单扩写，直接输出结果，不要任何解释：\n\n{text}",
    '扩写_丰富细节':     "请扩写以下文本，重点丰富细节描写，直接输出结果，不要任何解释：\n\n{text}",
    '扩写_增加论据':     "请扩写以下文本，增加更多论据和支撑，直接输出结果，不要任何解释：\n\n{text}",
    '缩写':              "请对以下文本进行缩写，保留核心内容，直接输出结果，不要任何解释：\n\n{text}",
    '润色':              "请对以下文本进行润色，使其更加流畅优美，直接输出结果，不要任何解释：\n\n{text}",
    '改变语气_向上汇报': "请将以下文本改写为向上级汇报的正式语气，直接输出结果，不要任何解释：\n\n{text}",
    '改变语气_向下传达': "请将以下文本改写为向下级传达指令的语气，直接输出结果，不要任何解释：\n\n{text}",
    '改变语气_对外宣传': "请将以下文本改写为对外宣传的语气，直接输出结果，不要任何解释：\n\n{text}",
    '改变语气_口语化':   "请将以下文本改写为口语化、通俗易懂的表达，直接输出结果，不要任何解释：\n\n{text}",
    '翻译_中译英':       "请将以下文本翻译成英文，直接输出翻译结果，不要任何解释：\n\n{text}",
    '翻译_英译中':       "请将以下文本翻译成中文，直接输出翻译结果，不要任何解释：\n\n{text}",
    '翻译_中译日':       "请将以下文本翻译成日文，直接输出翻译结果，不要任何解释：\n\n{text}",
}


class AIService:
    """AI 对话服务，支持 Qwen 和 DeepSeek"""

    # Qwen API 配置
    QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    QWEN_MODELS = {
        "qwen-turbo": "qwen-turbo",
        "qwen-plus": "qwen-plus",
        "qwen-max": "qwen-max",
    }

    # DeepSeek API 配置
    DEEPSEEK_BASE_URL = "https://api.deepseek.com"
    DEEPSEEK_MODELS = {
        "deepseek-v3": "deepseek-chat",
        "deepseek-r1": "deepseek-reasoner",
    }

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=120.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    def _get_api_key_and_base_url(self) -> tuple[str, str]:
        """根据 API_MODE 获取 API Key 和基础 URL"""
        mode = settings.API_MODE.lower()

        if mode == "auto":
            # 自动选择：优先 Qwen，其次 DeepSeek
            if settings.QWEN_API_KEY:
                return settings.QWEN_API_KEY, self.QWEN_BASE_URL
            elif settings.DEEPSEEK_API_KEY:
                return settings.DEEPSEEK_API_KEY, self.DEEPSEEK_BASE_URL
            else:
                raise AIServiceError("未配置任何 AI API Key")

        elif mode == "qwen":
            if not settings.QWEN_API_KEY:
                raise AIServiceError("未配置 QWEN_API_KEY")
            return settings.QWEN_API_KEY, self.QWEN_BASE_URL

        elif mode == "deepseek":
            if not settings.DEEPSEEK_API_KEY:
                raise AIServiceError("未配置 DEEPSEEK_API_KEY")
            return settings.DEEPSEEK_API_KEY, self.DEEPSEEK_BASE_URL

        else:
            raise AIServiceError(f"未知的 API_MODE: {mode}")

    def _get_model_name(self, model: str) -> str:
        """映射模型名称到 API 模型名"""
        # Qwen 模型
        if model in self.QWEN_MODELS:
            return self.QWEN_MODELS[model]
        # DeepSeek 模型
        if model in self.DEEPSEEK_MODELS:
            return self.DEEPSEEK_MODELS[model]
        # 未知模型，返回原值
        return model

    def _build_messages(self, message: str, history: Optional[list] = None, enable思考: bool = False) -> list:
        """构建消息列表"""
        messages = []
        # 如果启用思考模式，添加系统提示词
        if enable思考:
            messages.append({
                "role": "system",
                "content": "你是一个善于思考的AI助手。在回答用户问题时，请先进行深入思考和分析，把你的思考过程放在<think></think>标签中，然后再给出最终答案。这样可以帮助用户更好地理解你的推理过程。"
            })
        if history:
            for msg in history:
                if isinstance(msg, dict):
                    messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
                else:
                    messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": message})
        return messages

    async def chat_stream(
        self, message: str, model: str = "deepseek-v3", history: Optional[list] = None, enable思考: bool = False
    ) -> AsyncGenerator[str, None]:
        """
        流式对话

        Args:
            message: 用户消息
            model: 模型名称 (qwen-turbo, qwen-plus, deepseek-v3, deepseek-r1)
            history: 历史消息
            enable思考: 是否启用思考模式

        Yields:
            SSE 格式的响应片段
        """
        # 如果启用思考模式且当前模型支持，调整模型或提示词
        actual_model = model
        if enable思考:
            # 对于 qwen-turbo，启用思考模式时使用 qwen-plus 或添加系统提示词
            if model == "qwen-turbo":
                actual_model = "qwen-plus"  # 升级到更强的模型
            # deepseek-r1 本身就是推理模型，保持不变

        api_key, base_url = self._get_api_key_and_base_url()
        model_name = self._get_model_name(actual_model)
        messages = self._build_messages(message, history, enable思考)

        client = await self._get_client()

        # 判断使用哪个 API
        is_qwen = base_url == self.QWEN_BASE_URL

        if is_qwen:
            url = f"{base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model_name,
                "messages": messages,
                "stream": True,
                "temperature": 0.7,
            }
        else:
            # DeepSeek
            url = f"{base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model_name,
                "messages": messages,
                "stream": True,
            }

        logger.info(f"AI 请求: model={actual_model}, api={base_url}, enable思考={enable思考}")

        try:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    error_text = error_body.decode("utf-8", errors="replace")
                    logger.error(f"AI API 错误: {response.status_code} {error_text}")
                    yield f"data: {json.dumps({'error': f'API 错误: {response.status_code}'})}\n\n"
                    return

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data = line[6:]  # 去掉 "data: " 前缀
                        if data.strip() == "[DONE]":
                            yield "data: [DONE]\n\n"
                            return
                        yield f"data: {data}\n\n"

        except httpx.TimeoutException:
            logger.error("AI API 请求超时")
            yield f"data: {json.dumps({'error': '请求超时'})}\n\n"
        except Exception as e:
            logger.error(f"AI API 异常: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    async def chat(
        self, message: str, model: str = "deepseek-v3", history: Optional[list] = None, enable思考: bool = False
    ) -> dict:
        """
        非流式对话

        Args:
            enable思考: 是否启用思考模式

        Returns:
            {"content": "响应内容", "model": "模型名"}
        """
        # 如果启用思考模式且当前模型支持，调整模型或提示词
        actual_model = model
        if enable思考:
            if model == "qwen-turbo":
                actual_model = "qwen-plus"

        api_key, base_url = self._get_api_key_and_base_url()
        model_name = self._get_model_name(actual_model)
        messages = self._build_messages(message, history, enable思考)

        client = await self._get_client()

        is_qwen = base_url == self.QWEN_BASE_URL

        if is_qwen:
            url = f"{base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model_name,
                "messages": messages,
                "stream": False,
                "temperature": 0.7,
            }
        else:
            url = f"{base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model_name,
                "messages": messages,
                "stream": False,
            }

        logger.info(f"AI 请求 (非流式): model={actual_model}, api={base_url}, enable思考={enable思考}")

        try:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"AI API 错误: {response.status_code} {error_text}")
                raise AIServiceError(f"API 错误: {response.status_code}")

            result = response.json()
            content = result["choices"][0]["message"]["content"]
            return {"content": content, "model": model}

        except Exception as e:
            logger.error(f"AI API 异常: {e}")
            raise AIServiceError(str(e))

    async def rewrite(self, text: str, type: str, sub_type: Optional[str] = None) -> str:
        """
        文本改写/润色

        Args:
            text: 原始文本
            type: 操作类型（改写/扩写/缩写/润色/改变语气/翻译）
            sub_type: 子类型（如 简单扩写、向上汇报、中译英 等）

        Returns:
            处理后的文本
        """
        key = f"{type}_{sub_type}" if sub_type else type
        prompt_template = REWRITE_PROMPTS.get(key) or REWRITE_PROMPTS.get(type)
        if not prompt_template:
            raise AIServiceError(f"不支持的操作类型: {key}")

        prompt = prompt_template.format(text=text)
        logger.info(f"rewrite 请求: type={key}, text_len={len(text)}")
        # 根据当前 API 配置选择合适的默认模型，避免跨 API 调用
        _, base_url = self._get_api_key_and_base_url()
        default_model = "qwen-turbo" if base_url == self.QWEN_BASE_URL else "deepseek-v3"
        result = await self.chat(message=prompt, model=default_model)
        return result["content"]

    async def generate_filename(self, markdown: str) -> str:
        """
        根据 Markdown 内容生成简短的文件名（不含扩展名）。
        失败时返回空字符串，由调用方降级为时间戳名。
        """
        import asyncio
        import re

        # 移除 LaTeX 公式（$...$ 和 $$...$$），避免公式内容干扰文件名生成
        text_without_formula = re.sub(r'\$\$[\s\S]*?\$\$|\$[^$\n]+\$', '', markdown)

        # 只取前 400 字符，节省 token
        preview = text_without_formula[:400].strip()
        if not preview:
            return ""

        prompt = (
            "请根据以下文档内容，生成一个简短的中文文件名（不含扩展名，不超过20个字符，"
            "只能包含中文、英文字母和数字，不含任何标点、空格或特殊字符）。"
            "直接输出文件名，不要任何解释。\n\n文档内容：\n" + preview
        )

        try:
            _, base_url = self._get_api_key_and_base_url()
            model = "qwen-turbo" if base_url == self.QWEN_BASE_URL else "deepseek-v3"
            result = await asyncio.wait_for(
                self.chat(message=prompt, model=model),
                timeout=8,
            )
            name = result["content"].strip()
            # 清除 Windows/Linux 文件名非法字符，只保留中文、字母、数字
            name = re.sub(r'[\\/:*?"<>|\s\r\n$]', "", name)
            # 限制长度
            name = name[:30]
            return name if name else ""
        except Exception as e:
            logger.warning(f"generate_filename 失败，将使用时间戳名: {e}")
            return ""


# 全局单例
ai_service = AIService()
