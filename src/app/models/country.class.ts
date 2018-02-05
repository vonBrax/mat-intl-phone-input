export class Country {
  name: string;
  iso2: string;
  dialCode: string;
  priority: number;
  areaCodes: string[];

  constructor(country: any[]) {
    this.name = country[0];
    this.iso2 = country[1];
    this.dialCode = country[2];
    this.priority = country[3] || 0;
    this.areaCodes = country[4] || null;
  }
}
