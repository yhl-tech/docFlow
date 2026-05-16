<#
.SYNOPSIS
    DocFlow 开发工作流快速启动脚本 (Windows)

.DESCRIPTION
    一键完成：读取US -> 生成任务 -> 创建分支 -> 实现代码 -> 测试 -> 提交

.PARAMETER UsId
    用户故事ID (e.g., PROJ-123)

.PARAMETER AutoCommit
    自动提交每个任务

.PARAMETER TaskId
    只执行特定任务ID

.PARAMETER Config
    配置文件路径

.EXAMPLE
    .\scripts\dev.ps1 PROJ-123
    .\scripts\dev.ps1 PROJ-123 -AutoCommit
    .\scripts\dev.ps1 PROJ-123 -TaskId PROJ-123-T001
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$UsId,

    [Parameter(Mandatory=$false)]
    [switch]$AutoCommit,

    [Parameter(Mandatory=$false)]
    [string]$TaskId,

    [Parameter(Mandatory=$false)]
    [string]$Config
)

# 错误处理
$ErrorActionPreference = "Stop"

# 颜色函数
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# 检查依赖
function Test-Dependencies {
    Write-Info "检查依赖..."

    # 检查 Python
    try {
        $pythonVersion = python --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Python 未安装"
        }
        Write-Success "Python: $pythonVersion"
    }
    catch {
        Write-Error "Python3 未安装或不在 PATH 中"
        exit 1
    }

    # 检查 Git
    try {
        $gitVersion = git --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Git 未安装"
        }
        Write-Success "Git: $gitVersion"
    }
    catch {
        Write-Error "Git 未安装或不在 PATH 中"
        exit 1
    }

    # 检查 Node.js (如果需要前端)
    if (Test-Path "frontend") {
        try {
            $nodeVersion = node --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Node.js: $nodeVersion"
            }
        }
        catch {
            Write-Warning "Node.js 未安装，前端功能可能不可用"
        }
    }

    Write-Success "依赖检查完成"
}

# 显示帮助
function Show-Help {
    Write-Host "DocFlow 开发工作流" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\scripts\dev.ps1 <US_ID> [options]"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\scripts\dev.ps1 PROJ-123                    # 完整工作流"
    Write-Host "  .\scripts\dev.ps1 PROJ-123 -AutoCommit        # 自动提交"
    Write-Host "  .\scripts\dev.ps1 PROJ-123 -TaskId T001       # 执行特定任务"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -AutoCommit      自动提交每个任务"
    Write-Host "  -TaskId <id>     只执行特定任务"
    Write-Host "  -Config <path>   配置文件路径"
    Write-Host "  -Help            显示帮助"
}

# 运行 Python 工作流脚本
function Invoke-Workflow {
    param(
        [string]$UsId,
        [bool]$AutoCommit,
        [string]$TaskId,
        [string]$Config
    )

    # 构建参数
    $args = @("scripts/dev-workflow.py", $UsId)

    if ($AutoCommit) {
        $args += "--auto-commit"
    }

    if ($TaskId) {
        $args += "--task"
        $args += $TaskId
    }

    if ($Config) {
        $args += "--config"
        $args += $Config
    }

    # 运行 Python 脚本
    Write-Info "启动开发工作流: $UsId"
    python @args

    if ($LASTEXITCODE -eq 0) {
        Write-Success "工作流完成!"
    }
    else {
        Write-Error "工作流失败"
        exit 1
    }
}

# 主函数
function Main {
    # 显示帮助
    if ($UsId -eq "--help" -or $UsId -eq "-h") {
        Show-Help
        exit 0
    }

    # 检查依赖
    Test-Dependencies

    # 运行工作流
    Invoke-Workflow -UsId $UsId -AutoCommit $AutoCommit.IsPresent -TaskId $TaskId -Config $Config
}

# 运行主函数
Main
