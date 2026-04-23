import json
import os
import sys
from collections import defaultdict

def parse_trivy_report(file_path):
    with open(file_path, "r") as f:
        data = json.load(f)

    severity_counts = defaultdict(int)
    critical_high_details = []

    results = data.get("Results", [])

    for result in results:
        vulnerabilities = result.get("Vulnerabilities") or []

        # 👇 Capture classification from the result level
        result_class = result.get("Class", "unknown")
        result_type = result.get("Type", "unknown")

        for vuln in vulnerabilities:
            severity = (vuln.get("Severity") or "").upper()

            if severity:
                severity_counts[severity] += 1

            if severity in ["CRITICAL", "HIGH"]:
                critical_high_details.append({
                    "VulnerabilityID": vuln.get("VulnerabilityID"),
                    "PkgName": vuln.get("PkgName"),
                    "Class": result_class,
                    "Type": result_type
                })

    return severity_counts, critical_high_details


def scan_directory(directory):
    reports = {}

    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            file_path = os.path.join(directory, filename)
            try:
                counts, details = parse_trivy_report(file_path)
                reports[filename] = {
                    "counts": counts,
                    "details": details
                }
            except Exception as e:
                print(f"Skipping {filename}: {e}")

    return reports


def classify_issue(cls):
    """Human-friendly label"""
    mapping = {
        "os-pkgs": "OS Packages",
        "lang-pkgs": "Application Dependencies",
        "config": "Misconfiguration",
        "secret": "Secrets"
    }
    return mapping.get(cls, cls)


if __name__ == "__main__":
    directory = sys.argv[1] if len(sys.argv) > 1 else "."

    if not os.path.isdir(directory):
        print("Invalid directory path")
        sys.exit(1)

    reports = scan_directory(directory)

    for filename, data in reports.items():
        print(f"\n===== {filename} =====")

        counts = data["counts"]
        print("Severity Counts:")
        for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            print(f"  {sev}: {counts.get(sev, 0)}")

        print("\nCRITICAL & HIGH Vulnerabilities:")
        if data["details"]:
            for item in data["details"]:
                issue_type = classify_issue(item["Class"])
                print(
                    f"  {item['VulnerabilityID']} - {item['PkgName']} "
                    f"[{issue_type} | {item['Type']}]"
                )
        else:
            print("  None found")