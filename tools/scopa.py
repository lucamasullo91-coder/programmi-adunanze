import re, sys
css = open(sys.argv[1]).read(); pre = sys.argv[2]
def split_sel(s):
    out, d, cur = [], 0, ''
    for ch in s:
        if ch == '(': d += 1
        if ch == ')': d -= 1
        if ch == ',' and d == 0: out.append(cur); cur = ''
        else: cur += ch
    out.append(cur); return [x.strip() for x in out if x.strip()]
def scope(sel):
    return ', '.join(pre + ' ' + x for x in split_sel(sel))
out = []
for line in css.split('\n'):
    pass
# reparse blocks
def blocks(s):
    i, n, res = 0, len(s), []
    while i < n:
        j = s.find('{', i)
        if j < 0: break
        sel = s[i:j].strip(); depth, k = 1, j + 1
        while k < n and depth:
            if s[k] == '{': depth += 1
            elif s[k] == '}': depth -= 1
            k += 1
        res.append((sel, s[j+1:k-1])); i = k
    return res
for sel, body in blocks(css):
    if sel.startswith('@'):
        out.append(sel + '{' + '\n'.join(scope(s2) + '{' + b2 + '}' for s2, b2 in blocks(body)) + '}')
    else:
        out.append(scope(sel) + '{' + body + '}')
print('\n'.join(out))
