# Home Inventory

This project was generated with Angular CLI version 10.1.2.

## Requirements

- Node 8+
- npm
- [elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html)

## Setup

1. Install requirements: `npm install --dev`
2. Setup elastic search, in `/etc/elasticsearch/elasticsearch.yml` add:
```yaml
cluster.initial_master_nodes: node-1
network.bind_host: 0.0.0.0
network.publish_host: 0.0.0.0
http.host: 0.0.0.0
network.host: ["0.0.0.0", 127.0.0.1", "[::1]"]
http.cors.enabled : true
http.cors.allow-origin : "*"
http.cors.allow-methods : OPTIONS, HEAD, GET, POST, PUT, DELETE
path.repo: ["/invar/home-inventory"]
```

3. Run server: `ng serve`

## Backup elasticsearch data

1. Create database: `mkdir /invar/home-inventory`.
2. Register Repository:
```bash
curl -XPUT localhost:9200/_snapshot/inventory \
      -H 'Content-Type: application/json'        \
      -d '{
    "type": "fs",
    "settings": {
        "location": "/invar/home-inventory",
        "compress": true
    }}'
```
3. Create Backup:
```bash
curl -XPUT localhost:9200/_snapshot/inventory/inventory \
      -H 'Content-Type: application/json'               \
      -d '{
  "indices": "inventory*",
  "ignore_unavailable": true,
  "include_global_state": false,
  "partial": false
}'
```

## Restore elasticsearch data

1. Create Restore:
```bash
curl -XPOST localhost:9200/_snapshot/inventory/inventory/_restore \
      -H 'Content-Type: application/json'                         \
      -d '{
  "indices": "inventory*",
  "ignore_unavailable": true,
  "include_global_state": false,
  "partial": false
}'
```

## Deploy

1. Build: `ng build --prod --base-href https://atb00ker.github.io/home-inventory/`
2. Deploy: `npx angular-cli-ghpages --dir dist/home-inventory/`
