
NOW := $(shell date -u '+%Y-%m-%dT%H-%M-%Sz')
IMAGE=registry.digitalocean.com/shelf/the-next-bug
TAG_PATH=.
BUILD_FLAGS=--rm

all: build

build:
	docker build $(BUILD_FLAGS) --tag $(IMAGE) --tag $(IMAGE):$(NOW) .
	echo $(NOW) > $(TAG_PATH)/$(subst /,-,$(IMAGE))

push: build
	docker push $(IMAGE)
	docker push $(IMAGE):$(NOW)

ci: BUILD_FLAGS=--force-rm --pull
ci: build push

clean:
	docker rmi ${IMAGE}

.PHONY: ci build push
