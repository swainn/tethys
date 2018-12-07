# Use an official Python runtime as a parent image
FROM python:2-slim-stretch

###############
# ENVIRONMENT #
###############
ENV  TETHYS_HOME="/usr/lib/tethys" \
     TETHYS_PORT=80 \
     TETHYS_PUBLIC_HOST="127.0.0.1" \
     TETHYS_DB_USERNAME="tethys_default" \
     TETHYS_DB_PASSWORD="pass" \
     TETHYS_DB_HOST="172.17.0.1" \
     TETHYS_DB_PORT=5432 \
     TETHYS_SUPER_USER="" \
     TETHYS_SUPER_USER_EMAIL="" \
     TETHYS_SUPER_USER_PASS=""

# Misc
ENV  ALLOWED_HOSTS="['127.0.0.1', 'localhost']" \
     BASH_PROFILE=".bashrc" \
     CONDA_HOME="${TETHYS_HOME}/miniconda" \
     CONDA_ENV_NAME=tethys \
     MINICONDA_URL="https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh" \
     PYTHON_VERSION=2 \
     UWSGI_PROCESSES=10 \
     CLIENT_MAX_BODY_SIZE="75M"

#########
# SETUP #
#########
RUN mkdir -p "${TETHYS_HOME}/src"
WORKDIR ${TETHYS_HOME}

# Speed up APT installs
RUN echo "force-unsafe-io" > /etc/dpkg/dpkg.cfg.d/02apt-speedup \
  ; echo "Acquire::http {No-Cache=True;};" > /etc/apt/apt.conf.d/no-cache

# Install APT packages
RUN apt-get update && apt-get -y install wget gnupg2 \
 && wget -O - https://repo.saltstack.com/apt/debian/9/amd64/latest/SALTSTACK-GPG-KEY.pub | apt-key add - \
 && echo "deb http://repo.saltstack.com/apt/debian/9/amd64/latest stretch main" > /etc/apt/sources.list.d/saltstack.list
RUN apt-get update && apt-get -y install bzip2 git nginx gcc salt-minion procps pv
RUN rm -f /etc/nginx/sites-enabled/default

# Install Miniconda
RUN wget ${MINICONDA_URL} -O "${TETHYS_HOME}/miniconda.sh" \
 && bash ${TETHYS_HOME}/miniconda.sh -b -p "${CONDA_HOME}" 

# Setup Conda Environment
ADD environment.yml ${TETHYS_HOME}/src/
WORKDIR ${TETHYS_HOME}/src
RUN ${CONDA_HOME}/bin/conda env create -n "${CONDA_ENV_NAME}" -f "environment.yml"

###########
# INSTALL #
###########
# ADD files from repo
ADD resources ${TETHYS_HOME}/src/resources/
ADD templates ${TETHYS_HOME}/src/templates/
ADD tethys_apps ${TETHYS_HOME}/src/tethys_apps/
ADD tethys_compute ${TETHYS_HOME}/src/tethys_compute/
ADD tethys_config ${TETHYS_HOME}/src/tethys_config/
ADD tethys_gizmos ${TETHYS_HOME}/src/tethys_gizmos/
ADD tethys_portal ${TETHYS_HOME}/src/tethys_portal/
ADD tethys_sdk ${TETHYS_HOME}/src/tethys_sdk/
ADD tethys_services ${TETHYS_HOME}/src/tethys_services/
ADD README.rst ${TETHYS_HOME}/src/
ADD *.py ${TETHYS_HOME}/src/

# Remove any apps that may have been installed in tethysapp
RUN rm -rf ${TETHYS_HOME}/src/tethys_apps/tethysapp \
  ; mkdir -p ${TETHYS_HOME}/src/tethys_apps/tethysapp
ADD tethys_apps/tethysapp/__init__.py ${TETHYS_HOME}/src/tethys_apps/tethysapp/

# Run Installer
RUN /bin/bash -c '. ${CONDA_HOME}/bin/activate ${CONDA_ENV_NAME} \
  ; python setup.py develop \
  ; conda install -c conda-forge uwsgi -y'
RUN mkdir ${TETHYS_HOME}/workspaces ${TETHYS_HOME}/apps ${TETHYS_HOME}/static

# Add static files
ADD static ${TETHYS_HOME}/src/static/

# Generate Inital Settings Files
RUN /bin/bash -c '. ${CONDA_HOME}/bin/activate ${CONDA_ENV_NAME} \
  ; tethys gen settings --production --allowed-host "${ALLOWED_HOST}" --db-username ${TETHYS_DB_USERNAME} --db-password ${TETHYS_DB_PASSWORD} --db-port ${TETHYS_DB_PORT} --overwrite \
  ; sed -i -e "s:#TETHYS_WORKSPACES_ROOT = .*$:TETHYS_WORKSPACES_ROOT = \"/usr/lib/tethys/workspaces\":" ${TETHYS_HOME}/src/tethys_portal/settings.py \
  ; tethys gen nginx --overwrite \
  ; tethys gen uwsgi_settings --overwrite \
  ; tethys gen uwsgi_service --overwrite \
  ; tethys manage collectstatic'

# Give NGINX Permission
RUN export NGINX_USER=$(grep 'user .*;' /etc/nginx/nginx.conf | awk '{print $2}' | awk -F';' '{print $1}') \
  ; find ${TETHYS_HOME} ! -user ${NGINX_USER} -print0 | pv | xargs -0 -I{} chown ${NGINX_USER}: {}

############
# CLEAN UP #
############
RUN apt-get -y remove wget gcc gnupg2 \
  ; apt-get -y autoremove \
  ; apt-get -y clean

#########################
# CONFIGURE  ENVIRONMENT#
#########################
ENV PATH ${CONDA_HOME}/miniconda/envs/tethys/bin:$PATH 
VOLUME ["${TETHYS_HOME}/workspaces", "${TETHYS_HOME}/keys"]
EXPOSE 80

###############*
# COPY IN SALT #
###############*
ADD docker/salt/ /srv/salt/
ADD docker/run.sh ${TETHYS_HOME}/

########
# RUN! #
########
WORKDIR ${TETHYS_HOME}
# Create Salt configuration based on ENVs
CMD bash run.sh
HEALTHCHECK --start-period=240s \
  CMD ps $(cat $(grep 'pid .*;' /etc/nginx/nginx.conf | awk '{print $2}' | awk -F';' '{print $1}')) > /dev/null && ps $(cat $(grep 'pidfile2: .*' src/tethys_portal/tethys_uwsgi.yml | awk '{print $2}')) > /dev/null;
