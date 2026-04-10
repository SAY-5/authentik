.SHELLFLAGS += -x -e
PWD = $(shell pwd)
UID = $(shell id -u)
GID = $(shell id -g)

include ../../scripts/make/container.mk

build:
	rm -rf src
	$(CONTAINER_COMPOSE) run --rm --user "${UID}:${GID}" gen \
		generate \
		-i /schema.yml \
		-g typescript-fetch \
		-o local \
		-c /local/config.yaml \
		--additional-properties=npmVersion=0.0.0 \
		--git-repo-id authentik \
		--git-user-id goauthentik
	rm -rf "${PWD}/.openapi-generator"
	npx prettier --write -u "${PWD}"
