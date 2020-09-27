import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { interval } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';
import { FormGroup } from '@angular/forms';

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

  createConnection() {
    let server = this.cookieService.get('es-server');
    if (!server) {
      server = 'http://localhost:9200';
    }
    this.cookieService.set('es-server', server);
    this._updateStatus();
    this._initElasticSearchIndexes();
  }

  _initElasticSearchIndexes() {
    this.createEmptyMetaIndex()
      .then()
      .catch(error => console.error('Error: ' + error.message));
    this.createEmptyInventory()
      .then()
      .catch(error => console.error('Error: ' + error.message));
  }

  createEmptyMetaIndex(): Promise<any> {
    let path = this.cookieService.get('es-server') + this.pathToMetadata;
    return this.http.get(path).pipe(catchError(() => {
      let data = `
      {
        "home" : [],
        "room" : []
      }`;
      return this.http.put(path, data, { headers: this.jsonHttpheaders })
    })).toPromise();
  }

  createEmptyInventory(): Promise<any> {
    let path = this.cookieService.get('es-server') + '/inventory';
    return this.http.get(path).pipe(catchError(() => {
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
      return this.http.put(path, data, { headers: this.jsonHttpheaders })
    })).toPromise();
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
    return this.http.get(this.cookieService.get('es-server')).toPromise();
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
      data = `{
      "script" : {
        "source": "`+ addToList + distinctFilter + `"
      }
    }`
    return this.http.post(path, data, { headers: this.jsonHttpheaders }).toPromise();
  }

  editLocation(fieldName: string, itemName: string, newName: string): Promise<any> {
    return this.addLocation(fieldName, newName).then(() => this.removeLocation(fieldName, itemName));
  }

  removeLocation(fieldName: string, itemName: string): Promise<any> {
    let path = this.cookieService.get('es-server') + this.pathToUpdateMetadata,
      ctx_source = `ctx._source.` + fieldName,
      removeFromList = ctx_source + `.remove(` + ctx_source + `.indexOf('` + itemName + `'));`,
      data = `{
      "script" : {
        "source": "`+ removeFromList + `"
      }
    }`
    return this.http.post(path, data, { headers: this.jsonHttpheaders }).toPromise();
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

  deleteInventoryImage(uuid: string | Int32Array): Promise<any> {
    let imgPath = this.cookieService.get('es-server') + '/inventory-images/_doc/' + uuid;
    return this.http.get(imgPath).toPromise()
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
    return this.http.delete(path).toPromise()
  }

  editInventory(uuid: string | Int32Array, name: string, description: string, count: number,
    landmark: string, room: string, home: string,
    uuidOld: string | Int32Array, image: string | null, imageExist): Promise<any> {

    return this.deleteInventory(uuidOld)
      .then(() => this.addInventory(uuid, name, description, count, landmark, room, home, image, imageExist));
  }

  getInventoryItemByUUID(uuid: string) {
    let url = this.cookieService.get('es-server') + '/inventory/_doc/' + uuid;
    return this.http.get(url).toPromise();
  }

  getInventoryItemImage(uuid: string) {
    let url = this.cookieService.get('es-server') + '/inventory-images/_doc/' + uuid;
    return this.http.get(url).toPromise();
  }

  // Search Section
  searchInInventory(searchQuery: string, searchInHome: string, searchInRoom: string, advancedSearch: string) {
    let path = this.cookieService.get('es-server') + '/inventory/_search',
      data, homeInfo, roomInfo;
    if (advancedSearch !== '') { data = advancedSearch; }
    else {
      searchInHome !== '' ? homeInfo = '{ "term": { "home": "' + searchInHome + '" } },' : homeInfo = '';
      searchInRoom !== '' ? roomInfo = '{ "term": { "room": "' + searchInRoom + '" } },' : roomInfo = '';
      data = `{"query": { "bool": {
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
    return this.http.get(this.cookieService.get('es-server') + this.pathToMetadata).toPromise();
  }

  getRoomListName(homeName, roomName): string {
    return homeName + '::' + roomName;
  }
}
