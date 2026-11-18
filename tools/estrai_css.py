import re, sys
src = open(sys.argv[1]).read()
src = re.sub(r'/\*[\s\S]*?\*/', '', src)
KEEP = re.compile(r'\.pgm|\.ctab|\.wslot|\.wtag')
def blocks(s):
    i, n, out = 0, len(s), []
    while i < n:
        j = s.find('{', i)
        if j < 0: break
        sel = s[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if s[k] == '{': depth += 1
            elif s[k] == '}': depth -= 1
            k += 1
        out.append((sel, s[j+1:k-1]))
        i = k
    return out
res = []
for sel, body in blocks(src):
    if sel.startswith('@media') or sel.startswith('@supports') or sel.startswith('@container'):
        inner = [f'{s2}{{{b2}}}' for s2, b2 in blocks(body) if KEEP.search(s2)]
        if inner: res.append(sel + '{' + '\n'.join(inner) + '}')
    elif sel.startswith('@'):
        continue
    elif KEEP.search(sel):
        res.append(f'{sel}{{{body.strip()}}}')
print('\n'.join(res))
