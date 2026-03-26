FROM floryn90/hugo:0.159.0-ext-onbuild AS hugo

FROM nginx

EXPOSE 80

COPY --from=hugo /target /usr/share/nginx/html
