with open('src/App.tsx', 'r') as f:
    lines = f.readlines()
with open('src/App.tsx', 'w') as f:
    for line in lines:
        if line.strip() == "gridStr += '\\n';":
            f.write("      gridStr += '\\n';\n")
        elif line.strip() == "';":
            continue
        elif "navigator.clipboard.writeText" in line:
            f.write("    navigator.clipboard.writeText(`I scored ${score} in 2048!\\n\\n${gridStr}`);\n")
        elif "navigator.clipboard.writeText" not in line and line.strip() == "${gridStr}`);":
            continue
        else:
            f.write(line)
