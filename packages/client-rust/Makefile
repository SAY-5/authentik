.SHELLFLAGS += -x -e
PWD = $(shell pwd)
UID = $(shell id -u)
GID = $(shell id -g)

include ../../scripts/make/container.mk

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	SED_INPLACE = /usr/bin/sed -i ''
else
	SED_INPLACE = sed -i
endif

build:
ifndef version
	$(error Usage: make build version=20xx.xx.xx)
endif
	rm -rf "${PWD}/src"
<<<<<<< HEAD
	"${PWD}/../../scripts/api_filter_schema.py" "${PWD}/../../schema.yml" "${PWD}/schema.yml" "${PWD}/operation_ids"
	docker compose run --rm --user "${UID}:${GID}" gen \
=======
	$(CONTAINER_COMPOSE) run --rm --user "${UID}:${GID}" gen \
>>>>>>> 80ebcf05f4 (core: use dynamic icon urls)
		generate \
		-i /local/schema.yml \
		-g rust \
		-o local \
		-c /local/config.yaml \
		--additional-properties=packageVersion=$(version)
	$(SED_INPLACE) 's/models::models::/models::/g' ${PWD}/src/apis/*
	rm -rf "${PWD}/.openapi-generator" "${PWD}/api/openapi.yaml" "${PWD}/schema.yml"
