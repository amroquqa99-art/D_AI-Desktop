FROM python:3.13-slim
WORKDIR /app
COPY script/dai_desktop.py script/dai_desktop.py
COPY tests/test_dai_desktop_integration.py tests/test_dai_desktop_integration.py
CMD ["python", "-m", "unittest", "discover", "-s", "tests", "-p", "test_dai_desktop_integration.py", "-v"]
