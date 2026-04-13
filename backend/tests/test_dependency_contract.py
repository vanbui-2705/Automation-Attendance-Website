from pathlib import Path


def _declared_requirements():
    requirements_path = Path(__file__).resolve().parents[1] / "requirements.txt"
    packages = set()

    for raw_line in requirements_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        package_name = line.split("==", 1)[0].strip().lower().replace("_", "-")
        packages.add(package_name)

    return packages


def test_insightface_requires_onnxruntime_package():
    packages = _declared_requirements()

    assert "insightface" in packages
    assert "onnxruntime" in packages
