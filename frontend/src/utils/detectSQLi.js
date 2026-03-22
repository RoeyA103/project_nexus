const PATTERNS = [
  { re: /('|--|;)/,                            label: 'single quote / comment' },
  { re: /\bOR\b\s+[\d'"]/i,                   label: 'OR bypass' },
  { re: /\bAND\b\s+[\d'"]/i,                  label: 'AND bypass' },
  { re: /\bDROP\b|\bDELETE\b|\bTRUNCATE\b/i,  label: 'DDL command' },
  { re: /\bSELECT\b.+\bFROM\b/i,              label: 'SELECT..FROM' },
  { re: /UNION.+SELECT/i,                      label: 'UNION injection' },
  { re: /\bEXEC\b|\bEXECUTE\b/i,              label: 'EXEC command' },
  { re: /1\s*=\s*1/i,                          label: 'always-true condition' },
]

export function detectSQLi(input) {
  for (const p of PATTERNS) {
    if (p.re.test(input)) return p.label
  }
  return null
}
