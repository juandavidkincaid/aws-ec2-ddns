#!/usr/bin/env bash
set -euo pipefail

REPO="juandavidkincaid/aws-ec2-ddns"
OPT_DIR="/opt/aws-ec2-ddns"
BIN_DIR="${OPT_DIR}/bin"
BINARY_NAME="aws-ec2-ddns"
SYMLINK_PATH="/usr/local/bin/${BINARY_NAME}"

echo "Installing ${BINARY_NAME}..."

# Detect OS
OS=$(uname -s)
case "${OS}" in
  Linux)
    OS_TARGET="linux"
    ;;
  Darwin)
    OS_TARGET="darwin"
    ;;
  *)
    echo "Error: Unsupported OS: ${OS}"
    echo "Supported: Linux, macOS (Darwin)"
    exit 1
    ;;
esac

# Detect architecture
ARCH=$(uname -m)
case "${ARCH}" in
  x86_64)
    ARCH_TARGET="x64"
    ;;
  aarch64 | arm64)
    ARCH_TARGET="arm64"
    ;;
  *)
    echo "Error: Unsupported architecture: ${ARCH}"
    echo "Supported: x86_64 (amd64), aarch64/arm64"
    exit 1
    ;;
esac

TARGET="${OS_TARGET}-${ARCH_TARGET}"

echo "Detected: ${OS} ${ARCH} -> ${TARGET}"

# Fetch latest release tag
echo "Fetching latest release..."
LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')

if [ -z "${LATEST_TAG}" ]; then
  echo "Error: Could not determine latest release"
  exit 1
fi

echo "Latest release: ${LATEST_TAG}"

# Create directory structure
mkdir -p "${BIN_DIR}"
mkdir -p "${OPT_DIR}/config"
mkdir -p "${OPT_DIR}/services"

# Download binary
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${LATEST_TAG}/${BINARY_NAME}-${TARGET}"
TMP_FILE=$(mktemp)

echo "Downloading ${DOWNLOAD_URL}..."
curl -fsSL -o "${TMP_FILE}" "${DOWNLOAD_URL}"

# Install binary
chmod 755 "${TMP_FILE}"
mv "${TMP_FILE}" "${BIN_DIR}/${BINARY_NAME}"

# Symlink to PATH
ln -sf "${BIN_DIR}/${BINARY_NAME}" "${SYMLINK_PATH}"

echo ""
echo "${BINARY_NAME} ${LATEST_TAG} installed successfully"
echo ""
echo "  Binary:  ${BIN_DIR}/${BINARY_NAME}"
echo "  Symlink: ${SYMLINK_PATH}"
echo "  Config:  ${OPT_DIR}/config/"
echo ""
echo "Usage:"
echo "  ${BINARY_NAME} update --target <ZONE_ID>:<DOMAIN> [--dry-run]"
echo "  sudo ${BINARY_NAME} register --target <ZONE_ID>:<DOMAIN> [--dry-run]"
echo ""
echo "Run '${BINARY_NAME} --help' for more information."
