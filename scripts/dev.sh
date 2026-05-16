#!/bin/bash

# DocFlow 开发工作流快速启动脚本
# 使用方法: ./scripts/dev.sh <US_ID> [options]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."

    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 未安装"
        exit 1
    fi

    # 检查 Git
    if ! command -v git &> /dev/null; then
        print_error "Git 未安装"
        exit 1
    fi

    # 检查 Node.js (如果需要前端)
    if [ -d "frontend" ]; then
        if ! command -v node &> /dev/null; then
            print_warning "Node.js 未安装，前端功能可能不可用"
        fi
    fi

    print_success "依赖检查完成"
}

# 显示帮助
show_help() {
    echo "DocFlow 开发工作流"
    echo ""
    echo "使用方法:"
    echo "  ./scripts/dev.sh <US_ID> [options]"
    echo ""
    echo "示例:"
    echo "  ./scripts/dev.sh PROJ-123                    # 完整工作流"
    echo "  ./scripts/dev.sh PROJ-123 --auto-commit      # 自动提交"
    echo "  ./scripts/dev.sh PROJ-123 --task T001        # 执行特定任务"
    echo ""
    echo "选项:"
    echo "  --auto-commit    自动提交每个任务"
    echo "  --task <id>      只执行特定任务"
    echo "  --config <path>  配置文件路径"
    echo "  --help           显示帮助"
}

# 主函数
main() {
    # 检查参数
    if [ $# -eq 0 ] || [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
        show_help
        exit 0
    fi

    US_ID=$1
    shift

    # 检查依赖
    check_dependencies

    # 运行工作流
    print_info "启动开发工作流: $US_ID"
    python3 scripts/dev-workflow.py "$US_ID" "$@"

    if [ $? -eq 0 ]; then
        print_success "工作流完成!"
    else
        print_error "工作流失败"
        exit 1
    fi
}

# 运行主函数
main "$@"
