build:
	if [ -f msg-event.zip ]; then rm -rf msg-event.zip; fi;
	if [ -f bootstrap ]; then rm bootstrap ; fi;
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap main.go;
	zip msg-event.zip bootstrap