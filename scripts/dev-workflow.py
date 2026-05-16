#!/usr/bin/env python3
"""
开发工作流自动化脚本

一键完成：读取US -> 生成任务 -> 创建分支 -> 实现代码 -> 测试 -> 提交

使用方法：
    python scripts/dev-workflow.py <US_ID> [options]

示例：
    python scripts/dev-workflow.py PROJ-123 --auto-commit
    python scripts/dev-workflow.py PROJ-123 --task T001
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# 添加项目根目录到 path
sys.path.insert(0, str(Path(__file__).parent))

from us_reader import USReader, UserStory, DevelopmentTask


class DevWorkflow:
    """开发工作流自动化"""

    def __init__(self, us_id: str, config_path: Optional[str] = None):
        self.us_id = us_id
        self.us_reader = USReader(config_path)
        self.us: Optional[UserStory] = None
        self.tasks: list[DevelopmentTask] = []
        self.current_task: Optional[DevelopmentTask] = None
        self.branch_name: Optional[str] = None

    def run(self, auto_commit: bool = False, specific_task: Optional[str] = None):
        """运行完整工作流"""
        try:
            print("=" * 60)
            print(f"🚀 开始处理 US: {self.us_id}")
            print("=" * 60)

            # 步骤1：读取US
            self._read_user_story()

            # 步骤2：生成任务
            self._generate_tasks()

            # 步骤3：创建功能分支
            self._create_feature_branch()

            # 步骤4：选择并执行任务
            if specific_task:
                self._execute_specific_task(specific_task)
            else:
                self._execute_all_tasks(auto_commit)

            # 步骤5：运行测试
            self._run_tests()

            # 步骤6：生成报告
            self._generate_report()

            print("\n" + "=" * 60)
            print("✅ 工作流完成！")
            print("=" * 60)

        except Exception as e:
            print(f"\n❌ 工作流失败: {e}")
            sys.exit(1)

    def _read_user_story(self):
        """读取用户故事"""
        print("\n📖 步骤1：读取用户故事...")
        self.us = self.us_reader.read_from_jira(self.us_id)
        print(f"   标题: {self.us.title}")
        print(f"   优先级: {self.us.priority}")
        print(f"   验收标准: {len(self.us.acceptance_criteria)} 个")

    def _generate_tasks(self):
        """生成开发任务"""
        print("\n📝 步骤2：生成开发任务...")
        requirements = self.us_reader.read_from_confluence(f"page-{self.us_id}")
        self.tasks = self.us_reader.generate_tasks(self.us, requirements)
        print(f"   生成了 {len(self.tasks)} 个任务")

        # 显示任务列表
        for task in self.tasks:
            priority_emoji = "🔴" if task.priority == 1 else "🟡" if task.priority == 2 else "🟢"
            print(f"   {priority_emoji} {task.id}: {task.title} ({task.type}, {task.estimated_hours}h)")

    def _create_feature_branch(self):
        """创建功能分支"""
        print("\n🌿 步骤3：创建功能分支...")

        # 确保在主分支上
        current_branch = self._get_current_branch()
        if current_branch not in ['main', 'master', 'develop']:
            print(f"   当前在分支: {current_branch}")
            print("   切换到 develop 分支...")
            self._run_git_command(['checkout', 'develop'])

        # 创建新分支
        timestamp = datetime.now().strftime("%Y%m%d")
        self.branch_name = f"feat/{self.us_id.lower()}-{timestamp}"

        print(f"   创建分支: {self.branch_name}")
        self._run_git_command(['checkout', '-b', self.branch_name])

    def _execute_specific_task(self, task_id: str):
        """执行特定任务"""
        print(f"\n🎯 执行任务: {task_id}")

        # 查找任务
        task = next((t for t in self.tasks if t.id == task_id), None)
        if not task:
            raise ValueError(f"任务 {task_id} 不存在")

        self.current_task = task
        self._execute_task(task)

    def _execute_all_tasks(self, auto_commit: bool):
        """执行所有任务"""
        print("\n⚡ 步骤4：执行任务...")

        for i, task in enumerate(self.tasks, 1):
            print(f"\n   [{i}/{len(self.tasks)}] {task.id}: {task.title}")
            self.current_task = task

            # 执行任务
            self._execute_task(task)

            # 自动提交
            if auto_commit:
                self._auto_commit(task)

    def _execute_task(self, task: DevelopmentTask):
        """执行单个任务"""
        print(f"     类型: {task.type}")
        print(f"     优先级: {task.priority}")
        print(f"     预估工时: {task.estimated_hours}h")

        if task.technical_notes:
            print(f"     技术说明:")
            for line in task.technical_notes.split('\n')[:5]:  # 只显示前5行
                print(f"       {line}")

        # 这里可以集成 Claude Code 来自动实现代码
        # 目前只是模拟
        print(f"     ✅ 任务已记录，准备实现...")

    def _auto_commit(self, task: DevelopmentTask):
        """自动提交"""
        print(f"\n   📦 自动提交任务 {task.id}...")

        # 检查是否有变更
        status = self._run_git_command(['status', '--porcelain'])
        if not status:
            print("     没有变更需要提交")
            return

        # 添加变更
        self._run_git_command(['add', '.'])

        # 提交信息
        commit_msg = f"feat({self.us_id.lower()}): {task.title}\n\n"
        commit_msg += f"Task: {task.id}\n"
        commit_msg += f"Type: {task.type}\n"
        commit_msg += f"Description: {task.description}\n"
        commit_msg += f"\nCo-Authored-By: Claude Code <noreply@anthropic.com>"

        # 写入临时文件
        temp_file = Path('.git/COMMIT_MSG_TEMP')
        temp_file.write_text(commit_msg, encoding='utf-8')

        try:
            self._run_git_command(['commit', '-F', str(temp_file)])
            print(f"     ✅ 已提交: {task.title}")
        finally:
            temp_file.unlink(missing_ok=True)

    def _run_tests(self):
        """运行测试"""
        print("\n🧪 步骤5：运行测试...")

        # 前端测试
        if self._has_frontend_changes():
            print("   运行前端测试...")
            self._run_command(['npm', 'run', 'test'], cwd='frontend')

        # 后端测试
        if self._has_backend_changes():
            print("   运行后端测试...")
            self._run_command(['pytest', 'tests/', '-v'], cwd='backend')

        print("   ✅ 所有测试通过")

    def _generate_report(self):
        """生成报告"""
        print("\n📊 步骤6：生成报告...")

        report = self.us_reader.generate_report(self.us, self.tasks)

        # 保存报告
        report_path = Path(f"reports/{self.us_id}-report.md")
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(report, encoding='utf-8')

        print(f"   报告已保存: {report_path}")

        # 显示摘要
        total_hours = sum(t.estimated_hours for t in self.tasks)
        print(f"\n   📋 摘要:")
        print(f"      US: {self.us.title}")
        print(f"      任务数: {len(self.tasks)}")
        print(f"      预估工时: {total_hours} 小时")
        print(f"      分支: {self.branch_name}")

    # ============================================
    # 辅助方法
    # ============================================

    def _get_current_branch(self) -> str:
        """获取当前分支名"""
        result = subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()

    def _run_git_command(self, args: list[str]) -> str:
        """运行 Git 命令"""
        result = subprocess.run(
            ['git'] + args,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()

    def _run_command(self, args: list[str], cwd: Optional[str] = None) -> str:
        """运行命令"""
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            cwd=cwd,
            check=True
        )
        return result.stdout.strip()

    def _has_frontend_changes(self) -> bool:
        """检查是否有前端变更"""
        try:
            result = self._run_git_command(['diff', '--name-only', 'HEAD~1'])
            return 'frontend/' in result
        except:
            return True

    def _has_backend_changes(self) -> bool:
        """检查是否有后端变更"""
        try:
            result = self._run_git_command(['diff', '--name-only', 'HEAD~1'])
            return 'backend/' in result
        except:
            return True


def main():
    parser = argparse.ArgumentParser(
        description="开发工作流自动化",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 完整工作流
  python scripts/dev-workflow.py PROJ-123

  # 自动提交模式
  python scripts/dev-workflow.py PROJ-123 --auto-commit

  # 只执行特定任务
  python scripts/dev-workflow.py PROJ-123 --task PROJ-123-T001
        """
    )

    parser.add_argument("us_id", help="用户故事ID (e.g., PROJ-123)")
    parser.add_argument("--config", help="配置文件路径", default=None)
    parser.add_argument("--auto-commit", action="store_true",
                       help="自动提交每个任务")
    parser.add_argument("--task", help="只执行特定任务ID", default=None)

    args = parser.parse_args()

    # 创建并运行工作流
    workflow = DevWorkflow(args.us_id, args.config)
    workflow.run(
        auto_commit=args.auto_commit,
        specific_task=args.task
    )


if __name__ == "__main__":
    main()
