from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

from app.services.ai_service import ai_service, AIServiceError

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # user / assistant / system
    content: str


class ChatRequest(BaseModel):
    message: str
    model: str = "deepseek-v3"
    history: Optional[List[ChatMessage]] = None
    enable思考: Optional[bool] = False


class ChatResponse(BaseModel):
    content: str
    model: str


class RewriteRequest(BaseModel):
    text: str
    type: str  # 改写 / 扩写 / 缩写 / 润色 / 改变语气 / 翻译
    expandSubType: Optional[str] = None
    toneSubType: Optional[str] = None
    translateSubType: Optional[str] = None


class RewriteResponse(BaseModel):
    result: str
    originalLength: int
    resultLength: int


@router.post("/chat", response_model=ChatResponse, summary="AI 对话")
async def chat(body: ChatRequest):
    """非流式 AI 对话"""
    try:
        result = await ai_service.chat(
            message=body.message,
            model=body.model,
            history=[h.model_dump() for h in body.history] if body.history else None,
            enable思考=body.enable思考,
        )
        return ChatResponse(content=result["content"], model=result["model"])
    except AIServiceError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream", summary="流式 AI 对话")
async def chat_stream(body: ChatRequest):
    """流式 AI 对话 (SSE)"""
    try:
        return StreamingResponse(
            ai_service.chat_stream(
                message=body.message,
                model=body.model,
                history=[h.model_dump() for h in body.history] if body.history else None,
                enable思考=body.enable思考,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except AIServiceError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rewrite", response_model=RewriteResponse, summary="文本润色/改写")
async def rewrite(body: RewriteRequest):
    try:
        sub_type = body.expandSubType or body.toneSubType or body.translateSubType
        result = await ai_service.rewrite(text=body.text, type=body.type, sub_type=sub_type)
        return RewriteResponse(
            result=result,
            originalLength=len(body.text),
            resultLength=len(result),
        )
    except AIServiceError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", summary="获取可用 AI 模型列表")
async def get_models():
    return ["qwen-turbo", "qwen-plus", "qwen-max", "deepseek-v3", "deepseek-r1"]
