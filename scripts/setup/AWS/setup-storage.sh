#!/bin/bash

################################################################################
# EBS Storage Setup Script for AWS EC2
################################################################################
# This script detects, formats, and mounts additional EBS volumes for IntentR.
# It also configures Docker to use the new volume for data storage.
#
# Usage:
#   sudo ./setup-storage.sh [options]
#
# Options:
#   --auto              Automatically detect and use the largest unmounted volume
#   --device DEVICE     Specify device (e.g., /dev/nvme1n1, /dev/xvdf)
#   --mount-point PATH  Mount point (default: /data)
#   --docker-only       Only configure Docker to use existing /data mount
#
# Example:
#   sudo ./setup-storage.sh --auto
#   sudo ./setup-storage.sh --device /dev/nvme1n1
#
# Created: 2025-12-30
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
MOUNT_POINT="/data"
FILESYSTEM_TYPE="xfs"
AUTO_DETECT=false
DOCKER_ONLY=false
DEVICE=""

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto)
                AUTO_DETECT=true
                shift
                ;;
            --device)
                DEVICE="$2"
                shift 2
                ;;
            --mount-point)
                MOUNT_POINT="$2"
                shift 2
                ;;
            --docker-only)
                DOCKER_ONLY=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
}

show_help() {
    echo "Usage: sudo $0 [options]"
    echo ""
    echo "Options:"
    echo "  --auto              Automatically detect and use the largest unmounted volume"
    echo "  --device DEVICE     Specify device (e.g., /dev/nvme1n1, /dev/xvdf)"
    echo "  --mount-point PATH  Mount point (default: /data)"
    echo "  --docker-only       Only configure Docker to use existing /data mount"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  sudo $0 --auto"
    echo "  sudo $0 --device /dev/nvme1n1"
    echo "  sudo $0 --docker-only"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root. Use: sudo $0"
    fi
}

# List available unmounted volumes
list_available_volumes() {
    log "Scanning for available volumes..."

    echo ""
    info "Available block devices:"
    lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,FSTYPE
    echo ""

    # Find unmounted disks (not partitions)
    AVAILABLE_VOLUMES=$(lsblk -dpno NAME,SIZE,TYPE | grep disk | while read name size type; do
        # Check if it has no partitions mounted and no filesystem
        if ! lsblk -no MOUNTPOINT "$name" 2>/dev/null | grep -q .; then
            # Check if it's not the root device
            ROOT_DEV=$(df / | tail -1 | awk '{print $1}' | sed 's/[0-9]*$//' | sed 's/p[0-9]*$//')
            if [[ "$name" != "$ROOT_DEV"* ]]; then
                echo "$name $size"
            fi
        fi
    done)

    if [ -z "$AVAILABLE_VOLUMES" ]; then
        warn "No unmounted volumes found"
        return 1
    fi

    info "Unmounted volumes available for configuration:"
    echo "$AVAILABLE_VOLUMES"
    return 0
}

# Auto-detect the best volume to use
auto_detect_volume() {
    log "Auto-detecting available volume..."

    # Find the largest unmounted disk
    DEVICE=$(lsblk -dpno NAME,SIZE,TYPE | grep disk | while read name size type; do
        # Check if unmounted
        if ! lsblk -no MOUNTPOINT "$name" 2>/dev/null | grep -q .; then
            # Check if it's not the root device
            ROOT_DEV=$(df / | tail -1 | awk '{print $1}' | sed 's/[0-9]*$//' | sed 's/p[0-9]*$//')
            if [[ "$name" != "$ROOT_DEV"* ]]; then
                # Get size in bytes for comparison
                SIZE_BYTES=$(lsblk -bno SIZE "$name" 2>/dev/null | head -1)
                echo "$SIZE_BYTES $name"
            fi
        fi
    done | sort -rn | head -1 | awk '{print $2}')

    if [ -z "$DEVICE" ]; then
        error "No suitable unmounted volume found. Use --device to specify manually."
    fi

    log "Auto-detected volume: $DEVICE"
}

# Check if volume is already formatted
check_filesystem() {
    local device=$1

    CURRENT_FS=$(lsblk -no FSTYPE "$device" 2>/dev/null | head -1)

    if [ -n "$CURRENT_FS" ]; then
        warn "Device $device already has filesystem: $CURRENT_FS"
        return 0
    fi
    return 1
}

# Format the volume
format_volume() {
    local device=$1

    if check_filesystem "$device"; then
        info "Skipping format - filesystem already exists"
        return 0
    fi

    log "Formatting $device with $FILESYSTEM_TYPE..."

    if [ "$FILESYSTEM_TYPE" = "xfs" ]; then
        mkfs.xfs "$device"
    elif [ "$FILESYSTEM_TYPE" = "ext4" ]; then
        mkfs.ext4 "$device"
    else
        error "Unsupported filesystem type: $FILESYSTEM_TYPE"
    fi

    log "Volume formatted successfully"
}

# Mount the volume
mount_volume() {
    local device=$1
    local mount_point=$2

    # Check if already mounted
    if mountpoint -q "$mount_point" 2>/dev/null; then
        warn "$mount_point is already mounted"
        return 0
    fi

    log "Creating mount point: $mount_point"
    mkdir -p "$mount_point"

    log "Mounting $device to $mount_point..."
    mount "$device" "$mount_point"

    # Verify mount
    if mountpoint -q "$mount_point"; then
        log "Volume mounted successfully"
        df -h "$mount_point"
    else
        error "Failed to mount volume"
    fi
}

# Add to fstab for persistence
configure_fstab() {
    local device=$1
    local mount_point=$2

    # Get UUID
    UUID=$(blkid -s UUID -o value "$device")

    if [ -z "$UUID" ]; then
        error "Could not get UUID for $device"
    fi

    log "Configuring fstab for persistent mount..."

    # Check if already in fstab
    if grep -q "$UUID" /etc/fstab; then
        warn "Device already in fstab"
        return 0
    fi

    # Add to fstab
    echo "UUID=$UUID $mount_point $FILESYSTEM_TYPE defaults,nofail 0 2" >> /etc/fstab

    log "Added to /etc/fstab:"
    grep "$UUID" /etc/fstab
}

# Configure Docker to use the new volume
configure_docker_storage() {
    local data_dir=$1

    log "Configuring Docker to use $data_dir/docker..."

    DOCKER_DATA_DIR="$data_dir/docker"
    DAEMON_JSON="/etc/docker/daemon.json"

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        warn "Docker not installed yet. Configuration will be applied when Docker is installed."
        mkdir -p /etc/docker
        echo "{\"data-root\": \"$DOCKER_DATA_DIR\"}" > "$DAEMON_JSON"
        return 0
    fi

    # Stop Docker
    log "Stopping Docker service..."
    systemctl stop docker.socket 2>/dev/null || true
    systemctl stop docker 2>/dev/null || true

    # Create new Docker data directory
    mkdir -p "$DOCKER_DATA_DIR"

    # Copy existing Docker data if exists and not empty
    if [ -d "/var/lib/docker" ] && [ "$(ls -A /var/lib/docker 2>/dev/null)" ]; then
        if [ ! -d "$DOCKER_DATA_DIR/overlay2" ]; then
            log "Copying existing Docker data to new location..."
            rsync -aP /var/lib/docker/ "$DOCKER_DATA_DIR/" 2>/dev/null || true
        else
            warn "Docker data already exists in $DOCKER_DATA_DIR"
        fi
    fi

    # Create daemon.json
    mkdir -p /etc/docker
    echo "{\"data-root\": \"$DOCKER_DATA_DIR\"}" > "$DAEMON_JSON"

    log "Docker daemon.json configured:"
    cat "$DAEMON_JSON"

    # Reload and restart Docker
    log "Starting Docker with new configuration..."
    systemctl daemon-reload
    systemctl start docker

    # Verify
    sleep 2
    NEW_ROOT=$(docker info 2>/dev/null | grep "Docker Root Dir" | awk '{print $4}')

    if [ "$NEW_ROOT" = "$DOCKER_DATA_DIR" ]; then
        log "Docker successfully configured to use $DOCKER_DATA_DIR"

        # Optionally clean up old Docker data
        if [ -d "/var/lib/docker" ] && [ "$NEW_ROOT" = "$DOCKER_DATA_DIR" ]; then
            info "You can remove old Docker data with: sudo rm -rf /var/lib/docker"
        fi
    else
        warn "Docker Root Dir is $NEW_ROOT (expected $DOCKER_DATA_DIR)"
    fi
}

# Display summary
display_summary() {
    echo ""
    log "=============================================="
    log "  Storage Setup Complete!"
    log "=============================================="
    echo ""
    info "Mount Point: $MOUNT_POINT"
    df -h "$MOUNT_POINT"
    echo ""

    if [ -f /etc/docker/daemon.json ]; then
        info "Docker Configuration:"
        cat /etc/docker/daemon.json
        echo ""
    fi

    info "Disk Usage:"
    df -h "$MOUNT_POINT"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    parse_args "$@"
    check_root

    log "Starting Storage Setup"
    log "======================"

    # Docker-only mode
    if [ "$DOCKER_ONLY" = true ]; then
        if mountpoint -q "$MOUNT_POINT"; then
            configure_docker_storage "$MOUNT_POINT"
            display_summary
            exit 0
        else
            error "$MOUNT_POINT is not mounted. Run without --docker-only first."
        fi
    fi

    # List available volumes
    list_available_volumes || true

    # Auto-detect if requested
    if [ "$AUTO_DETECT" = true ]; then
        auto_detect_volume
    fi

    # Check if device is specified
    if [ -z "$DEVICE" ]; then
        echo ""
        warn "No device specified. Use --auto or --device to specify a volume."
        echo ""
        show_help
        exit 1
    fi

    # Validate device exists
    if [ ! -b "$DEVICE" ]; then
        error "Device $DEVICE does not exist or is not a block device"
    fi

    # Confirm with user
    echo ""
    warn "This will format and mount $DEVICE to $MOUNT_POINT"
    warn "All data on $DEVICE will be ERASED!"
    echo ""
    read -p "Continue? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        log "Aborted by user"
        exit 0
    fi

    # Perform setup
    format_volume "$DEVICE"
    mount_volume "$DEVICE" "$MOUNT_POINT"
    configure_fstab "$DEVICE" "$MOUNT_POINT"
    configure_docker_storage "$MOUNT_POINT"
    display_summary

    log "Storage setup completed successfully!"
}

main "$@"
