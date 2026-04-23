{{- range . }}
[[Results]]
Target = "{{ .Target }}"
{{- range .Vulnerabilities }}
[[Results.Vulnerabilities]]
VulnerabilityID = "{{ .VulnerabilityID }}"
PkgName = "{{ .PkgName }}"
InstalledVersion = "{{ .InstalledVersion }}"
Severity = "{{ .Severity }}"
Title = "{{ .Title }}"
{{- end }}
{{- end }}
