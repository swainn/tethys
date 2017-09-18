# Use an official Python runtime as a parent image
FROM python:2.7-slim

WORKDIR /usr/lib/tethys

# Add files to docker image
ADD docker/install_tethys.sh /usr/lib/tethys/install_tethys.sh
ADD docker/setup_tethys.sh /usr/lib/tethys/setup_tethys.sh
ADD . /usr/lib/tethys/src

# Arguments
ARG TETHYSBUILD_BRANCH=release
ARG TETHYSBUILD_PY_VERSION=2
ARG TETHYSBUILD_TETHYS_HOME=/usr/lib/tethys
ARG TETHYSBUILD_CONDA_HOME=/usr/lib/tethys/miniconda
ARG TETHYSBUILD_CONDA_ENV_NAME=tethys

# Run Scripts to Get Files
RUN pwd \
    && apt-get update \
    && apt-get install -y wget bzip2 git \
    && bash install_tethys.sh \
         -b $TETHYSBUILD_BRANCH \
         --python-version $TETHYSBUILD_PY_VERSION \
         --tethys-home $TETHYSBUILD_TETHYS_HOME \
         --conda-home $TETHYSBUILD_CONDA_HOME \
         --conda-env-name $TETHYSBUILD_CONDA_ENV_NAME \


# Make port 8000 available to the outside world
EXPOSE 8000

# Configure Tethys
ENV PATH ${TETHYSBUILD_CONDA_HOME:-/usr/lib/tethys/miniconda}/envs/tethys/bin:$PATH

# Install Tethys

CMD echo Stating Tethys Setup \
    && bash setup_tethys.sh \
         -b ${TETHYSBUILD_BRANCH:-release} \
         --allowed-host ${TETHYSBUILD_ALLOWED_HOST:-127.0.0.1} \
         --python-version ${TETHYSBUILD_PY_VERSION:-2} \
         --db-username ${TETHYSBUILD_DB_USERNAME:-tethys_default} \
         --db-password ${TETHYSBUILD_DB_PASSWORD:-pass} \
         --db-host ${TETHYSBUILD_DB_HOST:-127.0.0.1} \
         --db-port ${TETHYSBUILD_DB_PORT:-5432} \
         --db-create "true" \
         --superuser ${TETHYSBUILD_SUPERUSER:-tethys_super} \
         --superuser-pass ${TETHYSBUILD_SUPERUSER_PASS:-admin} \
         --tethys-home ${TETHYSBUILD_TETHYS_HOME:-/usr/lib/tethys} \
         --conda-home ${TETHYSBUILD_CONDA_HOME:-/usr/lib/tethys/miniconda} \
    && echo Setup Complete \
    && cd ${TETHYSBUILD_TETHYS_HOME:-/usr/lib/tethys}/src \
    && echo Source Directory: $PWD \
    && echo Starting Tethys on ${TETHYSBUILD_ALLOWED_HOST:-0.0.0.0}:${TETHYSBUILD_HOST_PORT:-8000} \
    && tethys manage start -p ${TETHYSBUILD_DOCKER_IP:-0.0.0.0}:${TETHYSBUILD_HOST_PORT:-8000}
