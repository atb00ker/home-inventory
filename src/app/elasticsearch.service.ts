import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { interval } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';
import { FormGroup } from '@angular/forms';
import { Md5 } from 'ts-md5';

@Injectable({
  providedIn: 'root',
})
export class ElasticSearchService {
  private pathToUpdateMetadata = '/meta/_update/storage';
  private pathToMetadata = '/meta/_doc/storage';
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
    this._createMetaIndex();
  }

  _createMetaIndex() {
    this.createEmptyIndex()
      .then()
      .catch(error => {
        console.error('Error: ' + error.message);
      });
  }

  createEmptyIndex(): Promise<any> {
    let path = this.cookieService.get('es-server') + this.pathToMetadata;
    return this.http.get(path).pipe(catchError(() => {
      let data = `
      {
        "home" : [],
        "room" : []
      }`;
      return this.http.put(path, data, { headers: this.jsonHttpheaders });
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
    this._createMetaIndex();
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
    return this.removeLocation(fieldName, itemName).then(() => this.addLocation(fieldName, newName));
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
  manageInventory(action: string, inventoryForm: FormGroup): Promise<any> {
    if (action == 'add')
      return this.addInventory(inventoryForm)
        .then(() => this._getStorageMetaData());
    else if (action == 'delete')
      return this.deleteInventory(inventoryForm)
        .then(() => this._getStorageMetaData());
    else if (action == 'edit')
      return this.editInventory(inventoryForm)
        .then(() => this._getStorageMetaData());
  }

  addInventory(inventoryForm: FormGroup): Promise<any> {
    let name = inventoryForm.controls.name.value,
      count = inventoryForm.controls.count.value,
      description = inventoryForm.controls.description.value,
      landmark = inventoryForm.controls.description.value,
      room = inventoryForm.controls.selectRoomForItem.value,
      home = inventoryForm.controls.selectHomeForItem.value,
      uuid = Md5.hashStr(name + count + description + landmark + home + room),
      path = this.cookieService.get('es-server') + '/inventory/_create/' + uuid,
      data = `{
        "name": "` + name + `",
        "description": "` + description + `",
        "count": "` + count + `",
        "landmark": "` + landmark + `",
        "room": "` + room + `",
        "home": "` + home + `"
      }`
    return this.http.put(path, data, { headers: this.jsonHttpheaders }).toPromise();
  }

  deleteInventory(inventoryForm: FormGroup): Promise<any> {
    return this.http.get(this.cookieService.get('es-server')).toPromise();
  }
  editInventory(inventoryForm: FormGroup): Promise<any> {
    return this.http.get(this.cookieService.get('es-server')).toPromise();
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
