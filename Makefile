
IMAGE=registry.digitalocean.com/shelf/the-next-bug
BUILD_FLAGS=--rm
NOW := $(shell date -u '+%Y-%m-%dT%H-%M-%Sz')

all: build

build:
	docker build $(BUILD_FLAGS) --tag $(IMAGE) --tag $(IMAGE):$(NOW) .

push: build
	docker push $(IMAGE)
	
ci: BUILD_FLAGS=--force-rm --pull
ci: build push

clean:
	docker rmi ${IMAGE}

.PHONY: ci build push
