import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { interval } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';


@Injectable({
  providedIn: 'root',
})
export class ElasticSearchService {
  private pathToMetadata = '/meta/_doc/storage';
  private jsonHttpheaders = new HttpHeaders({ 'Content-type': 'application/json' });
  private status = new BehaviorSubject(false);
  private homeList = new BehaviorSubject([]);
  private floorList = new BehaviorSubject([]);
  connectionStatus = this.status.asObservable();
  latestHomeList = this.homeList.asObservable();
  latestFloorList = this.floorList.asObservable();

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
    return this.http.get(path).pipe(catchError(error => {
      let data = `
      {
        "home" : [],
        "floor" : []
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

  addNewLocationItem(fieldName, itemName): Promise<any> {
    this._createMetaIndex();
    let path = this.cookieService.get('es-server') + '/meta/_update/storage',
      addToList = `ctx._source.` + fieldName + `.add(params.` + fieldName + `);`,
      distinctFilter = `ctx._source.` + fieldName + `=ctx._source.` + fieldName + `.stream().distinct().collect(Collectors.toList())`,
      data = `{
      "script" : {
        "source": "`+ addToList + distinctFilter + `",
        "params" : {
          "`+ fieldName + `": "` + itemName + `"
        }
      }
    }`
    this._getStorageMetaData();
    return this.http.post(path, data, { headers: this.jsonHttpheaders }).toPromise();
  }

  _getStorageMetaData() {
    this.getStorageMetaData()
      .then(data => {
        this.homeList.next(data._source.home);
        this.floorList.next(data._source.floor);
      })
      .catch(error => console.error('Error: ' + error.message));
  }

  getStorageMetaData(): Promise<any> {
    return this.http.get(this.cookieService.get('es-server') + this.pathToMetadata).toPromise();
  }
}
