FROM klakegg/hugo:onbuild AS hugo

FROM nginx

EXPOSE 80

COPY --from=hugo /target /usr/share/nginx/html
