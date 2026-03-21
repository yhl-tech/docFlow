"""诊断脚本：测试 pandoc 导出功能"""
import asyncio
import sys
import os

# 添加 backend 到 path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def diagnose():
    output = []
    output.append("=== 开始诊断 ===")

    # 1. 测试 shutil.which
    import shutil
    pandoc_path = shutil.which("pandoc")
    output.append(f"1. shutil.which('pandoc'): {pandoc_path}")

    # 2. 测试 export_service
    from app.services.export_service import export_service
    pandoc_available = await export_service.pandoc_available()
    output.append(f"2. export_service.pandoc_available(): {pandoc_available}")
    output.append(f"   _pandoc_bin_path: {export_service._pandoc_bin_path}")

    # 3. 测试实际导出
    test_markdown = "# Test\n\nHello World"
    output.append(f"3. 测试导出 docx (字数: {len(test_markdown)})...")
    try:
        result = await export_service.export_docx(test_markdown)
        output.append(f"   导出成功! 大小: {len(result)} bytes")
    except Exception as e:
        output.append(f"   导出失败: {type(e).__name__}: {e}")
        import traceback
        output.append(traceback.format_exc())

    output.append("=== 诊断完成 ===")

    # 打印结果
    result_text = "\n".join(output)
    print(result_text)

    # 写入文件
    with open("diagnose_output.txt", "w", encoding="utf-8") as f:
        f.write(result_text)

if __name__ == "__main__":
    asyncio.run(diagnose())
