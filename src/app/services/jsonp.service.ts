import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class JsonpService {

  constructor(private http: HttpClient) { }

  get(url: string): Observable<any> {
    return this.http.jsonp(url + '?callback=JSONP_CALLBACK', 'callback' );
  }

}
