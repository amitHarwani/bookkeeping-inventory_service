.PHONY: docker-build
docker-build:
	docker build -t inventory_service:0.1 . --ssh default=../sshkeys
