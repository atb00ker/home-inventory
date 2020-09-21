import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { interval } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';


@Injectable({
  providedIn: 'root',
})
export class ElasticSearchService {


  private jsonHttpheaders = new HttpHeaders({ 'Content-type': 'application/json' });
  private status = new BehaviorSubject(false);
  connectionStatus = this.status.asObservable();

  constructor(private http: HttpClient, public sanitizer: DomSanitizer, private cookieService: CookieService) {
    this.createConnection();
    interval(5000).subscribe((() => { this._updateStatus(); }));
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
      .then(() => true)
      .catch(error => {
        console.error('Error: ' + error.message);
      });
  }

  createEmptyIndex(): Promise<any> {
    let path = this.cookieService.get('es-server') + '/meta/_doc/storage';
    return this.http.get(path).pipe(catchError(error => {
      let data = `
      {
        "home" : [],
        "location" : []
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

  addNewHome(homeName): Promise<any> {
    this._createMetaIndex();
    return this.addHomeToStorage(homeName)
      .then(() => {
        let indexName = homeName.replace(/\s+/g, '-').toLowerCase(),
          url = this.cookieService.get('es-server') + '/' + indexName;
        return this.http.put<any>(url, null).toPromise();
      })
      .catch(error => { throw error });
  }

  addHomeToStorage(homeName): Promise<any> {
    let path = this.cookieService.get('es-server') + '/meta/_update/storage',
      data = `{
      "script" : {
        "source": "ctx._source.home.add(params.home);ctx._source.home = ctx._source.home.stream().distinct().collect(Collectors.toList())",
        "params" : {
          "home": "` + homeName + `"
        }
      }
    }`
    return this.http.post(path, data, { headers: this.jsonHttpheaders }).toPromise();
  }
}
