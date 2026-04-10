.SHELLFLAGS += -x -e
PWD = $(shell pwd)
UID = $(shell id -u)
GID = $(shell id -g)

build:
	rm -rf "${PWD}"/*.go
<<<<<<< HEAD
<<<<<<< HEAD
	"${PWD}/../../scripts/api_filter_schema.py" "${PWD}/../../schema.yml" "${PWD}/schema.yml" "${PWD}/operation_ids"
	docker compose run --rm --user "${UID}:${GID}" gen \
=======
	$(CONTAINER_COMPOSE) run --rm --user "${UID}:${GID}" gen \
>>>>>>> 80ebcf05f4 (core: use dynamic icon urls)
=======
	docker compose run --rm --user "${UID}:${GID}" gen \
>>>>>>> 2179ae0e3e (api: restore client makefiles)
		generate \
		-i /local/schema.yml \
		-g go \
		-o local \
		-c /local/config.yaml
	rm -rf "${PWD}/.openapi-generator" "${PWD}/api/openapi.yaml" "${PWD}/schema.yml"
	go fmt .
