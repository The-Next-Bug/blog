FROM floryn90/hugo:0.126.2-ext-onbuild AS hugo

FROM nginx

EXPOSE 80

COPY --from=hugo /target /usr/share/nginx/html
