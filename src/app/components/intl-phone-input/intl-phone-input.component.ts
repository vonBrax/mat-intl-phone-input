import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import { startWith } from 'rxjs/operators/startWith';
import { map } from 'rxjs/operators/map';
import { filter } from 'rxjs/operators/filter';

import { ALL_COUNTRIES, regionlessNanpNumbers, options } from '../../models/allCountries.data';
import { Country } from '../../models/country.class';
import { MatAutocompleteSelectedEvent } from '@angular/material';

@Component({
  selector: 'app-intl-phone-input',
  templateUrl: './intl-phone-input.component.html',
  styleUrls: ['./intl-phone-input.component.scss']
})
export class IntlPhoneInputComponent implements OnInit {

  formGroup: FormGroup;
  // dialCodeControl = new FormControl();
  // phoneNumberControl = new FormControl();
  countries: Country[];
  filteredCountries: Observable<Country[]>;
  selectedCountry;
  private countryCodes;
  private preferredCountries;

  constructor(private fb: FormBuilder) { }

  get allCountries(): Country[] {
    let countries = [];
    ALL_COUNTRIES.map( (country: any[]) => {
      countries.push(new Country(country));
    });
    return countries;
  }

  get dialCodeControl(): FormControl {
    return this.formGroup.get('dialCodeControl') as FormControl;
  }

  get phoneNumberControl(): FormControl {
    return this.formGroup.get('phoneNumberControl') as FormControl;
  }

  ngOnInit() {
    this.countries = this.allCountries;
    this.selectedCountry = this.countries[0];
    this.formGroup = this.fb.group({
      dialCodeControl: this.selectedCountry,
      phoneNumberControl: ''
    });

    this.filteredCountries = this.dialCodeControl.valueChanges
      .pipe(
        //map(value => value.dialCodeControl ),
        startWith<string | Country>(''),
        map(value => typeof value === 'string' ? value : value.name),
        map(name => name ? this.filter(name) : this.countries.slice())
    );

    this.phoneNumberControl.valueChanges
    .subscribe(data => {
      const dialCode = this._getDialCode(data);
      if(dialCode) {
        let result: Country[] = this.filter(dialCode.slice(1), true);
        if(result.length >= 1) {
          const sortedCountries = result.sort( (a,b) => a.priority - b.priority);
          console.log(result);
          this.selectedCountry = result[0];
          this.dialCodeControl.setValue(result[0]);
        }
      }
    });

    this._init();
  }

  onSelect(evt: MatAutocompleteSelectedEvent) {
    this.selectedCountry = evt.option.value;
    this.phoneNumberControl.setValue('+' + this.selectedCountry.dialCode);
  }

  displayFn(country?: Country): string | undefined {
    return country ? country.name.substring(0, country.name.indexOf(' (')) : '';
   /*  if (country) {
      return country.dialCode;
    }
    return undefined; */
  }

  filter(value: any, searchDialCode?: boolean): Country[] {
    // Concatenating the country name and dialcode
    // so both can be searched by the user
    return searchDialCode ?
      this.countries.filter(option => option.dialCode === value) :
      this.countries.filter(option =>
     ('+' + option.dialCode + ' ' + option.name.toLowerCase()).indexOf(value.toLowerCase()) > -1);
  }

  _getDialCode(number: string) {
    let dialCode = '';
    if (number.charAt(0) == "+") {
      let numericChars = '';
      for (let i = 0; i < number.length; i++) {
        let c = number.charAt(i);
        if (typeof (Number(c)) === 'number') {
          numericChars += c;
          // if current numericChars make a valid dial code
          if (this.countryCodes[numericChars]) {
            // store the actual raw string (useful for matching later)
            dialCode = number.substr(0, i + 1);
          }
          // longest dial code is 4 chars
          if (numericChars.length == 4) {
            break;
          }
        }
      }
    }
    return dialCode;
  }

  _init() {
    /*
    if (this.options.nationalMode) {
      this.options.autoHideDialCode = false;
    }
    if (this.options.separateDialCode) {
      this.options.autoHideDialCode = this.options.nationalMode = false;
    }

    const autoCountryDeferred = new $.Deferred();
    const utilsScriptDeferred = new $.Deferred();

    // in various situations there could be no country selected initially,
    // but we need to be able to assume this variable exists
    const selectedCountryData = {};
    */

    // process all the data: onlyCountries, excludeCountries, preferredCountries etc
    this._processCountryData();

    // set the initial state of the input value and the selected flag
    //# this._setInitialState();

    // start all of the event listeners: autoHideDialCode, input keydown, selectedFlag click
    //# this._initListeners();

    // utils script, and auto country
    //# this._initRequests();

    // return the deferreds
    //# return [autoCountryDeferred, utilsScriptDeferred];
  }

   _processCountryData () {
    this._processAllCountries();
    this._processCountryCodes();
    this._processPreferredCountries();
  }

  _addCountryCode(iso2: string, dialCode: string, priority?: number) {
    if (!(dialCode in this.countryCodes)) {
      this.countryCodes[dialCode] = [];
    }
    const index = priority || 0;
    this.countryCodes[dialCode][index] = iso2;
  }

  _processAllCountries() {
    const allCountries = this.allCountries;
    /*
    if (this.options.onlyCountries.length) {
      const lowerCaseOnlyCountries = this.options.onlyCountries.map(function(country) {
        return country.toLowerCase();
      });
      this.countries = allCountries.filter(function(country) {
        return lowerCaseOnlyCountries.indexOf(country.iso2) > -1;
      });
    } else if (this.options.excludeCountries.length) {
      const lowerCaseExcludeCountries = this.options.excludeCountries.map(function(country) {
        return country.toLowerCase();
      });
      this.countries = allCountries.filter(function(country) {
        return lowerCaseExcludeCountries.indexOf(country.iso2) === -1;
      });
    } else {
      this.countries = allCountries;
    }
    */
  }

  _processCountryCodes() {
    this.countryCodes = {};
    for (let i = 0; i < this.countries.length; i++) {
      let c = this.countries[i];
      this._addCountryCode(c.iso2, c.dialCode, c.priority);
      // area codes
      if (c.areaCodes) {
        for (var j = 0; j < c.areaCodes.length; j++) {
          // full dial code is country code + dial code
          this._addCountryCode(c.iso2, c.dialCode + c.areaCodes[j]);
        }
      }
    }
  }

  _processPreferredCountries() {
    this.preferredCountries = [];
    /*
    for (var i = 0; i < this.options.preferredCountries.length; i++) {
      var countryCode = this.options.preferredCountries[i].toLowerCase(),
        countryData = this._getCountryData(countryCode, false, true);
      if (countryData) {
        this.preferredCountries.push(countryData);
      }
    }
    */
  }

  private _getNumeric(s: string) {
    return s.replace(/\D/g, '');
  }

  private _isRegionlessNanp(number: string) {
    var numeric = this._getNumeric(number);
    if (numeric.charAt(0) === '1') {
      var areaCode = numeric.substr(1, 3);
      return regionlessNanpNumbers.indexOf(areaCode) > -1;
    }
    return false;
  }

  // set the initial state of the input value and the selected flag by:
  // 1. extracting a dial code from the given number
  // 2. using explicit initialCountry
  // 3. picking the first preferred country
  // 4. picking the first country
  _setInitialState() {
    const val = this.phoneNumberControl.value;

    // if we already have a dial code, and it's not a regionlessNanp,
    // we can go ahead and set the flag, else fall back to the default country
    // UPDATE: actually we do want to set the flag for a regionlessNanp in one situation:
    // if we're in nationalMode and there's no initialCountry - otherwise
    // we lose the +1 and we're left with an invalid number
    if (this._getDialCode(val) && (!this._isRegionlessNanp(val) ||
      (options.nationalMode && !options.initialCountry))) {
      this._updateFlagFromNumber(val);
    } else if (options.initialCountry !== "auto") {
      // see if we should select a flag
      if (options.initialCountry) {
        this._setFlag(options.initialCountry.toLowerCase());
      } else {
        // no dial code and no initialCountry, so default to first in list
        const defaultCountry = (this.preferredCountries.length) ? this.preferredCountries[0].iso2 :
          this.countries[0].iso2;
        if (!val) {
          this._setFlag(defaultCountry);
        }
      }

      // if empty and no nationalMode and no autoHideDialCode then insert the default dial code
      if (!val
          && !options.nationalMode
          && !options.autoHideDialCode
          && !options.separateDialCode) {
       // this.telInput.nativeElement.value = "+" + this.selectedCountryData.dialCode;
        this.phoneNumberControl.setValue("+" + this.selectedCountry.dialCode);
      }
    }
    // NOTE: if initialCountry is set to auto, that will be handled separately

    // format
    if (val) {
      // this wont be run after _updateDialCode as that's only called if no val
      this._updateValFromNumber(val);
    }
  }

  _setFlag(countryCode: string) {
    let prevCountry = (this.selectedCountry.iso2) ? this.selectedCountry : {};

    // do this first as it will throw an error and stop if countryCode is invalid
    this.selectedCountry = (countryCode) ? this._getCountryData(countryCode, false, false) : {};

    // update the defaultCountry - we only need the iso2 from now on, so just store that
    if (this.selectedCountry.iso2) {
      // this.defaultCountry = this.selectedCountryData.iso2;
    }

    // if (options.separateDialCode) {
    //   const dialCode = (this.selectedCountry.dialCode) ? "+" + this.selectedCountry.dialCode : "",
    //     parent = this.telInput.parent();
    //   if (prevCountry.dialCode) {
    //     parent.removeClass("iti-sdc-" + (prevCountry.dialCode.length + 1));
    //   }
    //   if (dialCode) {
    //     parent.addClass("iti-sdc-" + dialCode.length);
    //   }
    //   this.selectedDialCode.text(dialCode);
    // }

    // and the input's placeholder
    this._updatePlaceholder();

    // return if the flag has changed or not
    return (prevCountry.iso2 !== countryCode);
  }

  private _getCountryData(countryCode: string, ignoreOnlyCountriesOption: boolean, allowFail: boolean): Country {
    const countryList = (ignoreOnlyCountriesOption) ? this.allCountries : this.countries;
    for (let i = 0; i < countryList.length; i++) {
      if (countryList[i].iso2 == countryCode) {
        return countryList[i];
      }
    }
    if (allowFail) {
      return null;
    } else {
      throw new Error("No country data for '" + countryCode + "'");
    }
  }

  _updatePlaceholder() {
    const shouldSetPlaceholder = options.autoPlaceholder !== "off";

    if (window.intlTelInputUtils && shouldSetPlaceholder) {
      const numberType = intlTelInputUtils.numberType[options.placeholderNumberType];

      let placeholder = (this.selectedCountryData.iso2) ? intlTelInputUtils.getExampleNumber(this.selectedCountryData.iso2, this.options.nationalMode, numberType) : "";

      placeholder = this._beforeSetNumber(placeholder);

      if (typeof this.options.customPlaceholder === 'function') {
        placeholder = this.options.customPlaceholder(placeholder, this.selectedCountryData);
      }

      this.telInput.nativeElement.setAttribute("placeholder", placeholder);
    }
  }


  // check if need to select a new flag based on the given number
  // Note: called from _setInitialState, keyup handler, setNumber
  _updateFlagFromNumber(number: string) {
    // if we're in nationalMode and we already have US/Canada selected, make sure the number starts with a +1 so _getDialCode will be able to extract the area code
    // update: if we dont yet have selectedCountryData, but we're here (trying to update the flag from the number), that means we're initialising the plugin with a number that already has a dial code, so fine to ignore this bit
    if (number && options.nationalMode && this.selectedCountry.dialCode == "1" && number.charAt(0) != "+") {
      if (number.charAt(0) != "1") {
        number = "1" + number;
      }
      number = "+" + number;
    }

    // try and extract valid dial code from input
    var dialCode = this._getDialCode(number),
      countryCode = null,
      numeric = this._getNumeric(number);
    if (dialCode) {
      // check if one of the matching countries is already selected
      var countryCodes = this.countryCodes[this._getNumeric(dialCode)],
        alreadySelected = this.countryCodes.indexOf(this.selectedCountry.iso2),
        // check if the given number contains a NANP area code i.e. the only dialCode that could be extracted was +1 (instead of say +1204) and the actual number's length is >=4
        isNanpAreaCode = (dialCode == "+1" && numeric.length >= 4),
        nanpSelected = (this.selectedCountry.dialCode == "1");

      // only update the flag if:
      // A) NOT (we currently have a NANP flag selected, and the number is a regionlessNanp)
      // AND
      // B) either a matching country is not already selected OR the number contains a NANP area code (ensure the flag is set to the first matching country)
      if (!(nanpSelected && this._isRegionlessNanp(numeric)) && (!alreadySelected || isNanpAreaCode)) {
        // if using onlyCountries option, countryCodes[0] may be empty, so we must find the first non-empty index
        for (var j = 0; j < countryCodes.length; j++) {
          if (countryCodes[j]) {
            countryCode = countryCodes[j];
            break;
          }
        }
      }
    } else if (number.charAt(0) == "+" && numeric.length) {
      // invalid dial code, so empty
      // Note: use getNumeric here because the number has not been formatted yet, so could contain bad chars
      countryCode = "";
    } else if (!number || number == "+") {
      // empty, or just a plus, so default
      countryCode = this.defaultCountry;
    }

    if (countryCode !== null) {
      return this._setFlag(countryCode);
    }
    return false;
  }


}
