#!/usr/bin/env python3
"""
US Reader - 从 Jira/Confluence 读取用户故事并生成开发任务

使用方法：
    python scripts/us-reader.py <US_ID>

示例：
    python scripts/us-reader.py PROJ-123
"""

import argparse
import json
import sys
from typing import Optional
from dataclasses import dataclass
from pathlib import Path


@dataclass
class UserStory:
    """用户故事数据结构"""
    id: str
    title: str
    description: str
    acceptance_criteria: list[str]
    priority: str
    status: str
    assignee: Optional[str] = None
    epic: Optional[str] = None
    labels: list[str] = None

    def __post_init__(self):
        if self.labels is None:
            self.labels = []


@dataclass
class DevelopmentTask:
    """开发任务数据结构"""
    id: str
    title: str
    description: str
    type: str  # frontend, backend, fullstack
    priority: int
    estimated_hours: float
    dependencies: list[str]
    technical_notes: str


class USReader:
    """US 读取器"""

    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)

    def _load_config(self, config_path: Optional[str]) -> dict:
        """加载配置"""
        default_config = {
            "jira": {
                "base_url": "https://your-jira.atlassian.net",
                "project_key": "DOCFLOW",
                "api_version": "3"
            },
            "confluence": {
                "base_url": "https://your-confluence.atlassian.net",
                "space_key": "DOCFLOW"
            },
            "task_generation": {
                "default_priority": 3,
                "frontend_keywords": ["UI", "component", "page", "style", "layout"],
                "backend_keywords": ["API", "database", "service", "endpoint"],
                "fullstack_keywords": ["feature", "integration", "workflow"]
            }
        }

        if config_path and Path(config_path).exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                user_config = json.load(f)
                # 深度合并配置
                self._deep_merge(default_config, user_config)

        return default_config

    def _deep_merge(self, base: dict, update: dict):
        """深度合并字典"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value

    def read_from_jira(self, us_id: str) -> UserStory:
        """
        从 Jira 读取用户故事

        注意：这需要配置 Jira API 凭证
        实际实现需要使用 jira 库或 REST API
        """
        # TODO: 实现 Jira API 集成
        # 这里提供一个示例结构
        print(f"📖 Reading US {us_id} from Jira...")

        # 模拟数据 - 实际应该从 Jira API 获取
        us = UserStory(
            id=us_id,
            title="模板样式优化",
            description="优化文档模板的样式配置系统，支持更多自定义选项",
            acceptance_criteria=[
                "支持自定义页眉页脚",
                "支持页码配置",
                "支持标题样式配置",
                "支持正文样式配置",
                "导出后样式正确应用"
            ],
            priority="High",
            status="In Progress",
            labels=["template", "frontend", "backend"]
        )

        return us

    def read_from_confluence(self, page_id: str) -> dict:
        """
        从 Confluence 读取需求文档

        注意：这需要配置 Confluence API 凭证
        """
        # TODO: 实现 Confluence API 集成
        print(f"📚 Reading requirements from Confluence page {page_id}...")

        # 模拟数据
        return {
            "technical_requirements": [
                "使用 TypeScript 严格模式",
                "遵循项目现有的代码风格",
                "支持响应式设计",
                "确保导出兼容性"
            ],
            "design_guidelines": [
                "使用 TailwindCSS",
                "遵循现有的设计系统",
                "支持暗色主题（未来）"
            ],
            "api_specifications": [
                "RESTful API 设计",
                "统一的错误处理",
                "完整的参数验证"
            ]
        }

    def generate_tasks(self, us: UserStory, requirements: dict) -> list[DevelopmentTask]:
        """根据用户故事生成开发任务"""
        tasks = []
        task_counter = 1

        # 根据验收标准生成任务
        for i, criteria in enumerate(us.acceptance_criteria, 1):
            task_type = self._determine_task_type(criteria, us.labels)

            task = DevelopmentTask(
                id=f"{us.id}-T{task_counter:03d}",
                title=f"实现：{criteria}",
                description=f"根据US {us.id}的验收标准，实现：{criteria}",
                type=task_type,
                priority=self._determine_priority(criteria),
                estimated_hours=self._estimate_hours(criteria),
                dependencies=[],
                technical_notes=self._generate_technical_notes(criteria, requirements)
            )
            tasks.append(task)
            task_counter += 1

        # 添加集成测试任务
        integration_task = DevelopmentTask(
            id=f"{us.id}-T{task_counter:03d}",
            title="集成测试",
            description=f"对US {us.id}的所有功能进行集成测试",
            type="fullstack",
            priority=2,
            estimated_hours=4.0,
            dependencies=[t.id for t in tasks],
            technical_notes="确保前后端联调正常，导出功能验证"
        )
        tasks.append(integration_task)

        # 添加代码审查任务
        review_task = DevelopmentTask(
            id=f"{us.id}-T{task_counter + 1:03d}",
            title="代码审查和优化",
            description=f"对US {us.id}的代码进行审查和优化",
            type="fullstack",
            priority=3,
            estimated_hours=2.0,
            dependencies=[integration_task.id],
            technical_notes="检查代码质量、性能、安全性"
        )
        tasks.append(review_task)

        return tasks

    def _determine_task_type(self, criteria: str, labels: list[str]) -> str:
        """确定任务类型"""
        criteria_lower = criteria.lower()

        # 检查前端关键词
        for keyword in self.config["task_generation"]["frontend_keywords"]:
            if keyword.lower() in criteria_lower:
                return "frontend"

        # 检查后端关键词
        for keyword in self.config["task_generation"]["backend_keywords"]:
            if keyword.lower() in criteria_lower:
                return "backend"

        # 检查标签
        if "frontend" in labels and "backend" in labels:
            return "fullstack"
        elif "frontend" in labels:
            return "frontend"
        elif "backend" in labels:
            return "backend"

        return "fullstack"

    def _determine_priority(self, criteria: str) -> int:
        """确定优先级（1-5，1最高）"""
        criteria_lower = criteria.lower()

        if "核心" in criteria_lower or "必须" in criteria_lower:
            return 1
        elif "重要" in criteria_lower:
            return 2
        elif "优化" in criteria_lower or "改进" in criteria_lower:
            return 3
        else:
            return 4

    def _estimate_hours(self, criteria: str) -> float:
        """估算工时"""
        criteria_lower = criteria.lower()

        if "简单" in criteria_lower or "基础" in criteria_lower:
            return 2.0
        elif "复杂" in criteria_lower or "高级" in criteria_lower:
            return 8.0
        else:
            return 4.0

    def _generate_technical_notes(self, criteria: str, requirements: dict) -> str:
        """生成技术说明"""
        notes = []

        # 添加技术要求
        if "technical_requirements" in requirements:
            notes.append("技术要求：")
            for req in requirements["technical_requirements"][:3]:  # 只取前3个
                notes.append(f"  - {req}")

        # 添加设计指南
        if "design_guidelines" in requirements:
            notes.append("\n设计指南：")
            for guideline in requirements["design_guidelines"][:2]:
                notes.append(f"  - {guideline}")

        return "\n".join(notes)

    def generate_report(self, us: UserStory, tasks: list[DevelopmentTask]) -> str:
        """生成开发报告"""
        report = []
        report.append(f"# 开发任务报告")
        report.append(f"\n## 用户故事：{us.title}")
        report.append(f"- **ID**: {us.id}")
        report.append(f"- **优先级**: {us.priority}")
        report.append(f"- **状态**: {us.status}")
        report.append(f"\n### 验收标准")
        for criteria in us.acceptance_criteria:
            report.append(f"- [ ] {criteria}")

        report.append(f"\n### 生成的任务")
        report.append(f"\n共生成 {len(tasks)} 个任务：\n")

        # 按类型分组
        frontend_tasks = [t for t in tasks if t.type == "frontend"]
        backend_tasks = [t for t in tasks if t.type == "backend"]
        fullstack_tasks = [t for t in tasks if t.type == "fullstack"]

        if frontend_tasks:
            report.append("#### 前端任务")
            for task in frontend_tasks:
                report.append(f"- **{task.id}**: {task.title} ({task.estimated_hours}h)")

        if backend_tasks:
            report.append("\n#### 后端任务")
            for task in backend_tasks:
                report.append(f"- **{task.id}**: {task.title} ({task.estimated_hours}h)")

        if fullstack_tasks:
            report.append("\n#### 全栈任务")
            for task in fullstack_tasks:
                report.append(f"- **{task.id}**: {task.title} ({task.estimated_hours}h)")

        # 统计信息
        total_hours = sum(t.estimated_hours for t in tasks)
        report.append(f"\n### 统计信息")
        report.append(f"- **总任务数**: {len(tasks)}")
        report.append(f"- **预估总工时**: {total_hours} 小时")
        report.append(f"- **前端任务**: {len(frontend_tasks)} 个")
        report.append(f"- **后端任务**: {len(backend_tasks)} 个")
        report.append(f"- **全栈任务**: {len(fullstack_tasks)} 个")

        return "\n".join(report)


def main():
    # 设置标准输出编码为 UTF-8
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

    parser = argparse.ArgumentParser(description="US Reader - 读取用户故事并生成开发任务")
    parser.add_argument("us_id", help="用户故事ID (e.g., PROJ-123)")
    parser.add_argument("--config", help="配置文件路径", default=None)
    parser.add_argument("--output", help="输出文件路径", default=None)
    parser.add_argument("--format", choices=["text", "json", "markdown"], default="markdown",
                       help="输出格式")

    args = parser.parse_args()

    # 创建 US Reader
    reader = USReader(args.config)

    try:
        # 读取用户故事
        print(f"🚀 Processing US: {args.us_id}")
        us = reader.read_from_jira(args.us_id)

        # 读取需求文档（如果有）
        requirements = reader.read_from_confluence(f"page-{args.us_id}")

        # 生成任务
        print("📝 Generating development tasks...")
        tasks = reader.generate_tasks(us, requirements)

        # 生成报告
        report = reader.generate_report(us, tasks)

        # 输出结果
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                if args.format == "json":
                    json.dump({
                        "user_story": {
                            "id": us.id,
                            "title": us.title,
                            "description": us.description,
                            "acceptance_criteria": us.acceptance_criteria,
                            "priority": us.priority,
                            "status": us.status
                        },
                        "tasks": [
                            {
                                "id": t.id,
                                "title": t.title,
                                "description": t.description,
                                "type": t.type,
                                "priority": t.priority,
                                "estimated_hours": t.estimated_hours,
                                "dependencies": t.dependencies,
                                "technical_notes": t.technical_notes
                            }
                            for t in tasks
                        ]
                    }, f, ensure_ascii=False, indent=2)
                else:
                    f.write(report)
            print(f"✅ Report saved to {args.output}")
        else:
            print("\n" + report)

        print(f"\n✅ Successfully generated {len(tasks)} tasks for US {args.us_id}")

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
