import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { interval } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class ElasticSearchService {
  private pathToUpdateMetadata = '/inventory-data/_update/metadata';
  private pathToMetadata = '/inventory-data/_doc/metadata';
  private jsonHttpheaders = new HttpHeaders({ 'Content-type': 'application/json' });
  private status = new BehaviorSubject(false);
  private homeList = new BehaviorSubject([]);
  private roomList = new BehaviorSubject([]);
  connectionStatus = this.status.asObservable();
  latestHomeList = this.homeList.asObservable();
  latestRoomList = this.roomList.asObservable();

  constructor(private http: HttpClient, public sanitizer: DomSanitizer, private cookieService: CookieService) {
    this.createConnection();
    this.periodicFunctions();
    interval(7000).subscribe(() => this.periodicFunctions());
  }

  periodicFunctions() {
    this._updateStatus();
    this._getStorageMetaData();
  }

  createConnection(): Promise<any> {
    let server = this.cookieService.get('es-server');
    if (!server) { server = 'http://localhost:9200'; }
    this.cookieService.set('es-server', server, 90);
    return this._initElasticSearchIndexes().then(() => this._updateStatus());
  }

  _initElasticSearchIndexes(): Promise<any> {
    if (this.cookieService.get('es-auth')) {
      this.jsonHttpheaders = new HttpHeaders({
        'Content-type': 'application/json',
        'Authorization': 'Bearer ' + this.cookieService.get('es-auth')
      });
    }
    else {
      this.jsonHttpheaders = new HttpHeaders({ 'Content-type': 'application/json' });
    }
    let metadataPromise = this.createEmptyMetaIndex()
      .then()
      .catch(error => console.error('Error: ' + error.message));
    let inventoryPromise = this.createEmptyInventory()
      .then()
      .catch(error => console.error('Error: ' + error.message));
    return Promise.allSettled([metadataPromise, inventoryPromise]);
  }

  createEmptyMetaIndex(): Promise<any> {
    let server = this.cookieService.get('es-server');
    return this.http.get(server + this.pathToMetadata, { headers: this.jsonHttpheaders }).toPromise()
      .catch(() => {
        let data = '{ "home" : [], "room" : [] }',
          indexInventoryPromise = this.http
            .put(server + '/inventory', null, { headers: this.jsonHttpheaders }).toPromise(),
          indexInventoryImagesPromise = this.http
            .put(server + '/inventory-images', null, { headers: this.jsonHttpheaders }).toPromise(),
          indexInventoryDataPromise = this.http
            .put(server + '/inventory-data', null, { headers: this.jsonHttpheaders }).toPromise(),
          indexInventoryMetaPromise = this.http
            .put(server + this.pathToMetadata, data, { headers: this.jsonHttpheaders }).toPromise();
        return Promise.allSettled([indexInventoryPromise, indexInventoryImagesPromise,
          indexInventoryMetaPromise, indexInventoryDataPromise]);
      });
  }

  createEmptyInventory(): Promise<any> {
    let path = this.cookieService.get('es-server') + '/inventory';
    return this.http.get(path, { headers: this.jsonHttpheaders }).toPromise()
      .catch(() => {
        let data = `{
          "mappings": {
            "properties": {
              "name": { "type": "text" },
              "description": { "type": "text" },
              "count": { "type": "short" },
              "home": { "type": "keyword" },
              "room": { "type": "keyword" },
              "landmark": { "type": "text" },
              "imageExist": { "type": "boolean" }
            }
          }
        }`
        this.http.put(path, data, { headers: this.jsonHttpheaders }).toPromise()
          .then()
      });
  }

  _updateStatus() {
    this.updateStatus()
      .then(() => this.status.next(true))
      .catch(error => {
        console.error('Error: ' + error.message);
        this.status.next(false);
      });
  }

  updateStatus(): Promise<any> {
    return this.http.get(this.cookieService.get('es-server'), { headers: this.jsonHttpheaders }).toPromise();
  }

  // Location Management
  manageLocation(action: string, fieldName: string, itemName: string, newName: string): Promise<any> {
    if (action == 'add')
      return this.addLocation(fieldName, itemName)
        .then(() => this._getStorageMetaData());
    else if (action == 'delete')
      return this.removeLocation(fieldName, itemName)
        .then(() => this._getStorageMetaData());
    else if (action == 'edit')
      return this.editLocation(fieldName, itemName, newName)
        .then(() => this._getStorageMetaData());
  }

  addLocation(fieldName: string, itemName: string): Promise<any> {
    this._initElasticSearchIndexes();
    let path = this.cookieService.get('es-server') + this.pathToUpdateMetadata,
      ctx_source = `ctx._source.` + fieldName,
      addToList = ctx_source + `.add('` + itemName + `');`,
      distinctFilter = ctx_source + `=` + ctx_source + `.stream().distinct().collect(Collectors.toList())`,
      data = '{ "script" : { "source": "' + addToList + distinctFilter + '" }}'
    return this.http.post(path, data, { headers: this.jsonHttpheaders }).toPromise();
  }

  editLocation(fieldName: string, itemName: string, newName: string): Promise<any> {
    return this.addLocation(fieldName, newName)
      .then(() => {
        let realItemName = fieldName == 'room' ? itemName.split('::')[1] : itemName,
          realNewName = fieldName == 'room' ? newName.split('::')[1] : newName,
          updatePath = this.cookieService.get('es-server') + '/inventory/_update_by_query',
          updateData = `{ "query": { "term": { "` + fieldName + `": "` + realItemName + `" }},
      "script": "ctx._source.` + fieldName + ` = '` + realNewName + `'" }`;
        this.http.post(updatePath, updateData, { headers: this.jsonHttpheaders }).toPromise();
        this.removeLocation(fieldName, itemName, false);
      });
  }

  removeLocation(fieldName: string, itemName: string, deleteItems: boolean = true): Promise<any> {
    let realItemName = fieldName == 'room' ? itemName.split('::')[1] : itemName,
      deletePath = this.cookieService.get('es-server') + '/inventory/_delete_by_query',
      deleteQuery = '{"query": { "bool": { "must": [{ "term": { "' +
        fieldName + '": "' + realItemName + '" }} ]}}}',
      deleteInventory = this.http.post(deletePath, deleteQuery,
        { headers: this.jsonHttpheaders }).toPromise();
    let path = this.cookieService.get('es-server') + this.pathToUpdateMetadata,
      ctx_source = `ctx._source.` + fieldName,
      removeFromList = ctx_source + `.remove(` + ctx_source + `.indexOf('` + itemName + `'));`,
      data = '{ "script" : { "source": "' + removeFromList + '" }}',
      deleteMetadata = this.http.post(path, data,
        { headers: this.jsonHttpheaders }).toPromise().then();
    return Promise.allSettled([deleteInventory, deleteMetadata]);
  }

  // Manage Inventory
  manageInventory(action: string, uuid: string | Int32Array, name: string, description: string, count: number,
    landmark: string, room: string, home: string, uuidOld: string | Int32Array,
    image: string | null, imageExist: boolean): Promise<any> {
    if (action == 'add')
      return this.addInventory(uuid, name, description, count, landmark, room, home, image, imageExist);
    else if (action == 'delete') {
      this.deleteInventoryImage(uuid);
      return this.deleteInventory(uuid);
    }
    else if (action == 'edit')
      return this.editInventory(uuid, name, description, count, landmark, room, home, uuidOld, image, imageExist);
  }

  addInventory(uuid: string | Int32Array, name: string, description: string, count: number,
    landmark: string, room: string, home: string, image: string | null, imageExist: boolean): Promise<any> {
    let path = this.cookieService.get('es-server') + '/inventory/_create/' + uuid,
      imgPath = this.cookieService.get('es-server') + '/inventory-images/_create/' + uuid,
      imgData = '{"image": "' + image + '" }',
      data = `{
        "name": "` + name + `",
        "description": "` + description + `",
        "count": ` + count + `,
        "landmark": "` + landmark + `",
        "room": "` + room + `",
        "home": "` + home + `",
        "imageExist": ` + imageExist + `
      }`;
    return this.http.put(path, data, { headers: this.jsonHttpheaders }).toPromise()
      .then(() => {
        if (imageExist) {
          this.http.put(imgPath, imgData, { headers: this.jsonHttpheaders }).toPromise();
        }
      });
  }

  getInventoryItemByUUID(uuid: string) {
    let url = this.cookieService.get('es-server') + '/inventory/_doc/' + uuid;
    return this.http.get(url, { headers: this.jsonHttpheaders }).toPromise();
  }

  getInventoryItemImage(uuid: string | Int32Array) {
    let url = this.cookieService.get('es-server') + '/inventory-images/_doc/' + uuid;
    return this.http.get(url, { headers: this.jsonHttpheaders }).toPromise();
  }

  deleteInventoryImage(uuid: string | Int32Array): Promise<any> {
    let imgPath = this.cookieService.get('es-server') + '/inventory-images/_doc/' + uuid;
    return this.http.get(imgPath, { headers: this.jsonHttpheaders }).toPromise()
      .then(() => {
        let bulkUrl = this.cookieService.get('es-server') + '/_bulk';
        let bulkData = '{ "delete" : { "_index" : "inventory-images", "_id" : "' + uuid + '" } }\n' +
          '{ "update" : { "_id" : "' + uuid + '", "_index" : "inventory" } }\n' +
          '{ "doc" : { "imageExist": false } }\n';
        this.http.post(bulkUrl, bulkData, { headers: this.jsonHttpheaders }).toPromise();
      })
      .catch(() => { })
  }

  deleteInventory(uuid: string | Int32Array): Promise<any> {
    let path = this.cookieService.get('es-server') + '/inventory/_doc/' + uuid;
    return this.http.delete(path, { headers: this.jsonHttpheaders }).toPromise()
  }

  editInventory(uuid: string | Int32Array, name: string, description: string, count: number,
    landmark: string, room: string, home: string,
    uuidOld: string | Int32Array, image: string | null, imageExist): Promise<any> {
    return this.getInventoryItemImage(uuidOld).then(data => {
      if (imageExist && image == null) { image = data["_source"]["image"]; }
      this.deleteInventory(uuidOld)
        .then(() => this.addInventory(uuid, name, description, count, landmark, room, home, image, imageExist));
    }).catch(() => {
      this.deleteInventory(uuidOld)
        .then(() => this.addInventory(uuid, name, description, count, landmark, room, home, image, imageExist));
    });
  }

  // Search Section
  searchInInventory(searchQuery: string, searchInHome: string, searchInRoom: string, advancedSearch: string) {
    let path = this.cookieService.get('es-server') + '/inventory/_search',
      data, homeInfo, roomInfo;
    if (advancedSearch !== '') { data = advancedSearch; }
    else {
      searchInHome !== '' ? homeInfo = '{ "term": { "home": "' + searchInHome + '" } },' : homeInfo = '';
      searchInRoom !== '' ? roomInfo = '{ "term": { "room": "' + searchInRoom + '" } },' : roomInfo = '';
      data = `{"size": 10000, "query": { "bool": {
                "must": [` + homeInfo + roomInfo + `
                  {
                    "multi_match": {
                      "query": "` + searchQuery + `",
                      "type": "most_fields",
                      "fields": ["name", "description", "landmark"]
                    }
                  }
                ]}
              }}`;
    }
    return this.http.post(path, data, { headers: this.jsonHttpheaders }).toPromise();
  }

  // Utilities Functions
  getRoomListForHome(homeName: string, pageRoomList: Array<string>): Array<string> {
    const removeLength = homeName.length + 2;
    return pageRoomList
      .filter(roomName => roomName.startsWith(homeName))
      .map(roomName => roomName.substring(removeLength));
  }

  _getStorageMetaData(): Promise<any> {
    return this.getStorageMetaData()
      .then(data => {
        this.homeList.next(data._source.home);
        this.roomList.next(data._source.room);
      })
      .catch(error => console.error('Error: ' + error.message));
  }

  getStorageMetaData(): Promise<any> {
    return this.http.get(this.cookieService.get('es-server') + this.pathToMetadata, { headers: this.jsonHttpheaders }).toPromise();
  }

  getRoomListName(homeName, roomName): string {
    return homeName + '::' + roomName;
  }
}
