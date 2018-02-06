import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';

import { Observable } from 'rxjs/Observable';
import { startWith } from 'rxjs/operators/startWith';
import { map } from 'rxjs/operators/map';
import { filter } from 'rxjs/operators/filter';

import { JsonpService } from '../../services/jsonp.service';


import { ALL_COUNTRIES, regionlessNanpNumbers, options } from '../../models/allCountries.data';
import { Country, IpInfoCallback } from '../../models/country.class';
import { MatAutocompleteSelectedEvent } from '@angular/material';
import { IntlTelInputUtils } from '../../models/utils';

@Component({
  selector: 'app-intl-phone-input',
  templateUrl: './intl-phone-input.component.html',
  styleUrls: ['./intl-phone-input.component.scss'],
  providers: [JsonpService]
})
export class IntlPhoneInputComponent implements OnInit {

  formGroup: FormGroup;
  countries: Country[];
  filteredCountries: Observable<Country[]>;
  selectedCountry: Country;
  intlTelInputUtils: IntlTelInputUtils;
  private countryCodes: any;
  private preferredCountries: Country[];
  private defaultCountry: string;

  @ViewChild('phoneNumberField')
  phoneNumberField: ElementRef;

  constructor(private fb: FormBuilder, private jsonpService: JsonpService ) { }

  get allCountries(): Country[] {
    const countries = [];
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

  get hiddenPhoneNumberControl(): FormControl {
    return this.formGroup.get('hiddenPhoneNumberControl') as FormControl;
  }

  ngOnInit() {
    this.formGroup = this.fb.group({
      dialCodeControl: '',
      phoneNumberControl: '',
      hiddenPhoneNumberControl: ''
    });

    this.filteredCountries = this.dialCodeControl.valueChanges
      .pipe(
        startWith<string | Country>(''),
        map(value => typeof value === 'string' ? value : value.name),
        map(name => name ? this.filter(name) : this.countries.slice())
    );
    this.phoneNumberControl.valueChanges
      .subscribe(data => {
        // this.hiddenPhoneNumberControl.setValue(this.intlTelInputUtils.formatNumber(data, this.selectedCountry.iso2));
        this.hiddenPhoneNumberControl.setValue( this.isValidNumber() ? this.getNumber() : 'invalid');
        this._updateFlagFromNumber(data);
        const dialCode = this.selectedCountry.dialCode;
      });

    /** TODO: CHANGE THE PATH HERE ONCE WE HAVE OUR
     * UTILS.TS FILE READY!!!
     */
    if (options.utilsScript) {
      this.intlTelInputUtils = new IntlTelInputUtils();
    }
    this._init();
  }

  onFocus(evt) {
    if (evt.target.value) {
      evt.target.setSelectionRange(0, evt.target.value.length);
    }
  }

  onSelect(evt: MatAutocompleteSelectedEvent) {
    // update selected flag and active list item
    const flagChanged = this._setFlag(evt.option.value.iso2);

    /** TODO: CHECK IF THIS FUNCTION SHOULD BE CALLED WHEN IN NATIONAL MODE */
    this._updateDialCode(evt.option.value.dialCode, true);

    // focus the input
    this.phoneNumberField.nativeElement.focus();
    const len = this.phoneNumberControl.value.length;
    this.phoneNumberField.nativeElement.setSelectionRange(len, len);

    // Update hidden field value
    this.hiddenPhoneNumberControl.setValue( this.isValidNumber() ? this.getNumber() : 'invalid');
  }

  displayFn(country?: Country): string | undefined {
    // if (!country) {
    //   return '';
    // }
    // const index = country.name.indexOf(' (');
    // return index > -1 ? country.name.substring(0, index) : country.name;
    return country ? country.iso2.toUpperCase() : '';
  }

  filter(value: any, searchDialCode?: boolean): Country[] {
    // Concatenating the country name, iso2 and dial code
    // so they all can be searched by the user
    /* return searchDialCode ?
      this.countries.filter(option => option.dialCode === value) :
      this.countries.filter(option =>
     ('+' + option.dialCode + ' ' + option.name.toLowerCase()).indexOf(value.toLowerCase()) > -1); */
     return this.countries.filter(option =>
     ('+' + option.dialCode + ' ' + option.iso2 + ' ' + option.name.toLowerCase()).indexOf(value.toLowerCase()) > -1);
  }

  private _getDialCode(number: string) {
    let dialCode = '';
    if (number.charAt(0) === '+') {
      let numericChars = '';
      for (let i = 0; i < number.length; i++) {
        const c = number.charAt(i);
        if (/\d/.test(c)) {
          numericChars += c;
          // if current numericChars make a valid dial code
          if (this.countryCodes[numericChars]) {
            // store the actual raw string (useful for matching later)
            dialCode = number.substr(0, i + 1);
          }
          // longest dial code is 4 chars
          if (numericChars.length === 4) {
            break;
          }
        }
      }
    }
    return dialCode;
  }

   // get the input val, adding the dial code if separateDialCode is enabled
  private _getFullNumber() {
    const val = this.phoneNumberControl.value.trim(),
      dialCode = this.selectedCountry.dialCode,
      numericVal = this._getNumeric(val),
      // normalized means ensure starts with a 1, so we can match against the full dial code
      normalizedVal = (numericVal.charAt(0) === '1') ? numericVal : '1' + numericVal;
    let prefix;

    if (options.separateDialCode) {
      prefix = '+' + dialCode;
    } else if (val.charAt(0) !== '+'
      && val.charAt(0) !== '1'
      && dialCode
      && dialCode.charAt(0) === '1'
      && dialCode.length === 4
      && dialCode !== normalizedVal.substr(0, 4)) {
      // if the user has entered a national NANP number, then ensure it includes the full dial code / area code
      prefix = dialCode.substr(1);
    } else {
      prefix = '';
    }
    return prefix + val;
  }


  private _init() {
    if (options.nationalMode) {
      options.autoHideDialCode = false;
    }
    if (options.separateDialCode) {
      options.autoHideDialCode = options.nationalMode = false;
    }

    // in various situations there could be no country selected initially,
    // but we need to be able to assume this variable exists
    this.selectedCountry = new Country(['', '', '']);

    // process all the data: onlyCountries, excludeCountries, preferredCountries etc
    this._processCountryData();

    // set the initial state of the input value and the selected flag
    this._setInitialState();

    // utils script, and auto country
    // this._initRequests(); ### --> Making a simpler check for autoCountry only...
    if (options.initialCountry === 'auto') {
      this._loadAutoCountry();
    }

    // return the deferreds
    // return [autoCountryDeferred, utilsScriptDeferred]; ###
  }

  private _processCountryData () {
    this._processAllCountries();
    this._processCountryCodes();
    this._processPreferredCountries();
  }

  private _processAllCountries() {
    const allCountries = this.allCountries;
    if (options.onlyCountries.length) {
      const lowerCaseOnlyCountries = options.onlyCountries.map(function(country) {
        return country.toLowerCase();
      });
      this.countries = allCountries.filter(function(country) {
        return lowerCaseOnlyCountries.indexOf(country.iso2) > -1;
      });
    } else if (options.excludeCountries.length) {
      const lowerCaseExcludeCountries = options.excludeCountries.map(function(country) {
        return country.toLowerCase();
      });
      this.countries = allCountries.filter(function(country) {
        return lowerCaseExcludeCountries.indexOf(country.iso2) === -1;
      });
    } else {
      this.countries = allCountries;
    }
  }

  private _processCountryCodes() {
    this.countryCodes = {};
    for (let i = 0; i < this.countries.length; i++) {
      const c = this.countries[i];
      this._addCountryCode(c.iso2, c.dialCode, c.priority);
      // area codes
      if (c.areaCodes) {
        for (let j = 0; j < c.areaCodes.length; j++) {
          // full dial code is country code + dial code
          this._addCountryCode(c.iso2, c.dialCode + c.areaCodes[j]);
        }
      }
    }
  }

  private _processPreferredCountries() {
    this.preferredCountries = [];

    for (let i = 0; i < options.preferredCountries.length; i++) {
      const countryCode = options.preferredCountries[i].toLowerCase(),
        countryData = this._getCountryData(countryCode, false, true);
      if (countryData) {
        if (i === options.preferredCountries.length - 1) {
          countryData['isLastPreferred'] = true;
        }
        const index = this.countries.indexOf(countryData);
        this.countries.splice(index, 1);
        this.countries.splice(i, 0, countryData);
        this.preferredCountries.push(countryData);
      }
    }
  }

  private _addCountryCode(iso2: string, dialCode: string, priority?: number) {
    if (!(dialCode in this.countryCodes)) {
      this.countryCodes[dialCode] = [];
    }
    const index = priority || 0;
    this.countryCodes[dialCode][index] = iso2;
  }

  private _getNumeric(s: string) {
    return s.replace(/\D/g, '');
  }

  private _isRegionlessNanp(number: string) {
    const numeric = this._getNumeric(number);
    if (numeric.charAt(0) === '1') {
      const areaCode = numeric.substr(1, 3);
      return regionlessNanpNumbers.indexOf(areaCode) > -1;
    }
    return false;
  }

  private _removeEmptyDialCode(): void {

    /** TODO: CHECK IF HIDDEN FIELD IS UPDATED ACCORDINGLY */
    const value = this.phoneNumberControl.value,
      startsPlus = (value.charAt(0) === '+');

    if (startsPlus) {
      const numeric = this._getNumeric(value);
      // if just a plus, or if just a dial code
      if (!numeric || this.selectedCountry.dialCode === numeric) {
        this.phoneNumberControl.setValue('');
      }
    }
  }

  // set the initial state of the input value and the selected flag by:
  // 1. extracting a dial code from the given number
  // 2. using explicit initialCountry
  // 3. picking the first preferred country
  // 4. picking the first country
  private _setInitialState() {
    const val = this.phoneNumberControl.value;

    if (this._getDialCode(val) && (!this._isRegionlessNanp(val) ||
      (options.nationalMode && !options.initialCountry))) {
      this._updateFlagFromNumber(val);
    } else if (options.initialCountry !== 'auto') {
      if (options.initialCountry) {
        this._setFlag(options.initialCountry.toLowerCase());
      } else {
        this.defaultCountry = (this.preferredCountries.length) ? this.preferredCountries[0].iso2 :
          this.countries[0].iso2;
        if (!val) {
          this._setFlag(this.defaultCountry);
        }
      }

      // if empty and no nationalMode and no autoHideDialCode then insert the default dial code
      if (!val
          && !options.nationalMode
          && !options.autoHideDialCode
          && !options.separateDialCode) {
        this.phoneNumberControl.setValue('+' + this.selectedCountry.dialCode);
      }

    // NOTE: if initialCountry is set to auto, that will be handled separately
    } else if (options.initialCountry === 'auto') {
      // PS: Although in the original plugin the 'auto' option is not checked here,
      // I prefer doing it so we can display a default flag when page load, so even
      // if there's a problem with the request for the country, at least we will display
      // a flag there.
      this.setCountry(this.preferredCountries.length ? this.preferredCountries[0].iso2 :
      this.countries[0].iso2);
    }

    // format
    if (val) {
      // this wont be run after _updateDialCode as that's only called if no val
      this._updateValFromNumber(val);
    }
  }

  private _setFlag(countryCode: string) {
    const prevCountry: Country = (this.selectedCountry.iso2) ? this.selectedCountry : new Country(['', '', '']);

    // do this first as it will throw an error and stop if countryCode is invalid
    this.selectedCountry = (countryCode) ? this._getCountryData(countryCode, false, false) : new Country(['', '', '']);
    this.dialCodeControl.setValue(this.selectedCountry);
    // setTimeout(() => {  console.log('SETTING VALUE'); this.dialCodeControl.setValue(this.selectedCountry); } );

    // update the defaultCountry - we only need the iso2 from now on, so just store that
    if (this.selectedCountry.iso2) {
      this.defaultCountry = this.selectedCountry.iso2;
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
    const countryList: Country[] = (ignoreOnlyCountriesOption) ? this.allCountries : this.countries;
    for (let i = 0; i < countryList.length; i++) {
      if (countryList[i].iso2 === countryCode) {
        return countryList[i];
      }
    }
    if (allowFail) {
      return null;
    } else {
      throw new Error('No country data for "' + countryCode + '"');
    }
  }

  private _updatePlaceholder() {
    const shouldSetPlaceholder = options.autoPlaceholder !== 'off';

    if (this.intlTelInputUtils && shouldSetPlaceholder) {
      const numberType = this.intlTelInputUtils.numberType[options.placeholderNumberType];

      let placeholder =
        (this.selectedCountry.iso2) ? this.intlTelInputUtils.getExampleNumber(this.selectedCountry.iso2, options.nationalMode, numberType) :
          '';
      placeholder = this._beforeSetNumber(placeholder);

      if (typeof options.customPlaceholder === 'function') {
        placeholder = options.customPlaceholder(placeholder, this.selectedCountry);
      }

      this.selectedCountry['placeholder'] = placeholder;
    }
  }

  // replace any existing dial code with the new one
  // Note: called from _selectListItem and setCountry
  private _updateDialCode (newDialCode, hasSelectedListItem) {
    const inputVal = this.phoneNumberControl.value;
    let newNumber;

    // save having to pass this every time
    newDialCode = '+' + newDialCode;

    if (inputVal.charAt(0) === '+') {
      // there's a plus so we're dealing with a replacement (doesn't matter if nationalMode or not)
      const prevDialCode = this._getDialCode(inputVal);
      if (prevDialCode) {
        // current number contains a valid dial code, so replace it
        newNumber = inputVal.replace(prevDialCode, newDialCode);
      } else {
        // current number contains an invalid dial code, so ditch it
        // (no way to determine where the invalid dial code ends and the rest of the number begins)
        newNumber = newDialCode;
      }
    } else if (options.nationalMode || options.separateDialCode) {
      // don't do anything
      return;
    } else {
      // nationalMode is disabled
      if (inputVal) {
        // there is an existing value with no dial code: prefix the new dial code
        newNumber = newDialCode + inputVal;
      } else if (hasSelectedListItem || !options.autoHideDialCode) {
        // no existing value and either they've just selected a list item, or autoHideDialCode is disabled: insert new dial code
        newNumber = newDialCode;
      } else {
        return;
      }
    }

    /** CHECK NEWNUMBER VARIABLE AND ORIGINAL IMPLEMENTATION OF UPDATE DIAL CODE */
    this.phoneNumberControl.setValue(newNumber);
  }

  // remove the dial code if separateDialCode is enabled
  private _beforeSetNumber(number: string) {
    if (options.separateDialCode) {
      let dialCode = this._getDialCode(number);
      if (dialCode) {
        // US dialCode is "+1", which is what we want
        // CA dialCode is "+1 123", which is wrong - should be "+1" (as it has multiple area codes)
        // AS dialCode is "+1 684", which is what we want
        // Solution: if the country has area codes, then revert to just the dial code
        if (this.selectedCountry.areaCodes !== null) {
          dialCode = '+' + this.selectedCountry.dialCode;
        }
        // a lot of numbers will have a space separating the dial code and the main number,
        // and some NANP numbers will have a hyphen e.g. +1 684-733-1234 - in both cases we want to get rid of it
        // NOTE: don't just trim all non-numerics as may want to preserve an open parenthesis etc
        const start = (number[dialCode.length] === ' ' || number[dialCode.length] === '-') ?
          dialCode.length + 1 :
          dialCode.length;
        number = number.substr(start);
      }
    }

    return number;
  }


  // check if need to select a new flag based on the given number
  // Note: called from _setInitialState, keyup handler, setNumber
  private _updateFlagFromNumber(number: string) {
    // if we're in nationalMode and we already have US/Canada selected,
    // make sure the number starts with a +1 so _getDialCode will be able to extract the area code
    // update: if we dont yet have selectedCountryData, but we're here (trying to update the flag from the number),
    // that means we're initialising the plugin with a number that already has a dial code, so fine to ignore this bit
    if (number && options.nationalMode && this.selectedCountry.dialCode === '1' && number.charAt(0) !== '+') {
      if (number.charAt(0) !== '1') {
        number = '1' + number;
      }
      number = '+' + number;
    }

    // try and extract valid dial code from input
    const dialCode = this._getDialCode(number),
      numeric = this._getNumeric(number);
    let countryCode = null;
    if (dialCode) {
      // check if one of the matching countries is already selected
      const countryCodes = this.countryCodes[this._getNumeric(dialCode)],
        // alreadySelected = this.countryCodes.indexOf(this.selectedCountry.iso2),
        alreadySelected = countryCodes.indexOf(this.selectedCountry.iso2) > -1,
        // check if the given number contains a NANP area code i.e. the only
        // dialCode that could be extracted was +1 (instead of say +1204) and the actual number's length is >=4
        isNanpAreaCode = (dialCode === '+1' && numeric.length >= 4),
        nanpSelected = (this.selectedCountry.dialCode === '1');

      // only update the flag if:
      // A) NOT (we currently have a NANP flag selected, and the number is a regionlessNanp)
      // AND
      // B) either a matching country is not already selected OR
      // the number contains a NANP area code (ensure the flag is set to the first matching country)
      if (!(nanpSelected && this._isRegionlessNanp(numeric)) && (!alreadySelected || isNanpAreaCode)) {
        // if using onlyCountries option, countryCodes[0] may be empty, so we must find the first non-empty index
        for (let j = 0; j < countryCodes.length; j++) {
          if (countryCodes[j]) {
            countryCode = countryCodes[j];
            break;
          }
        }
      }
    } else if (number.charAt(0) === '+' && numeric.length) {
      // invalid dial code, so empty
      // Note: use getNumeric here because the number has not been formatted yet, so could contain bad chars
      countryCode = '';
    } else if (!number || number === '+') {
      // empty, or just a plus, so default
      countryCode = this.defaultCountry;
    }

    if (countryCode !== null) {
      return this._setFlag(countryCode);
    }
    return false;
  }

  // update the input's value to the given val (format first if possible)
  // NOTE: this is called from _setInitialState, handleUtils and setNumber
  private _updateValFromNumber(number: string) {
    if (options.formatOnDisplay && options.utilsScript && this.selectedCountry) {
      const format = (!options.separateDialCode && (options.nationalMode || number.charAt(0) !== '+')) ?
        'National' :
        'International';
      number = this.intlTelInputUtils.formatNumber(number, this.selectedCountry.iso2, format);
    }
    console.log('inside updateValFromNumber');
    console.log('Number before beforeSetNumber: ' + number);
    number = this._beforeSetNumber(number);
    console.log('Number after beforeSetNumber: ' + number);
    this.phoneNumberControl.setValue(number);
  }

  private _loadAutoCountry() {
    // PS: Removing the callback parameter from here since it doesn't
    // seem to work (we just subscribe to the observable instead and
    // call the apropriate method when it arrives)
    const url = options.geoIpJsonp;
    this.jsonpService.get(url).subscribe(value => this.handleAutoCountry(value));
  }

  protected handleAutoCountry(data: IpInfoCallback ) {
    if (options.initialCountry === 'auto') {
      // we must set this even if there is an initial val in the input:
      // in case the initial val is invalid and they delete it - they should see their auto country
      this.defaultCountry = data.country;
        // if there's no initial value in the input, then update the flag
        if (!this.phoneNumberControl.value) {
            // this.setCountry(this.defaultCountry);
            this.setCountry(this.defaultCountry);
        }
    }
  }

   /********************
   *  PUBLIC METHODS
   ********************/

  // get the extension from the current number
  public getExtension() {
    if (this.intlTelInputUtils) {
      return this.intlTelInputUtils.getExtension(this._getFullNumber(), this.selectedCountry.iso2);
    }
    return '';
  }

  // format the number to the given format
  public getNumber(format?: string) {
    if (this.intlTelInputUtils) {
      return this.intlTelInputUtils.formatNumber(this._getFullNumber(), this.selectedCountry.iso2, format);
    }
    return '';
  }

  // get the type of the entered number e.g. landline/mobile
  public getNumberType() {
    if (this.intlTelInputUtils) {
      return this.intlTelInputUtils.getNumberType(this._getFullNumber(), this.selectedCountry.iso2);
    }
    return -99;
  }

  // get the validation error
  public getValidationError() {
    if (this.intlTelInputUtils) {
      return this.intlTelInputUtils.getValidationError(this._getFullNumber(), this.selectedCountry.iso2);
    }
    return -99;
  }

  public isValidNumber() {
    const val = this._getFullNumber().trim(),
      countryCode = (options.nationalMode) ? this.selectedCountry.iso2 : '';
    // return (this.intlTelInputUtils ? this.intlTelInputUtils.isValidNumber(val, countryCode) : null);
    return (this.intlTelInputUtils ? this.intlTelInputUtils.isValidNumberCustom(val, countryCode) : null);
  }

  // update the selected flag, and update the input val accordingly
  public setCountry(countryCode: string) {
    countryCode = countryCode.toLowerCase();
    // check if already selected
    if (this.selectedCountry.iso2 !== countryCode) {
      this._setFlag(countryCode);
      this._updateDialCode(this.selectedCountry.dialCode, false);
    }
  }

  // set the input value and update the flag
  public setNumber(number: string) {
    // we must update the flag first, which updates this.selectedCountryData, which is used for formatting the number before displaying it
    const flagChanged = this._updateFlagFromNumber(number);
    this._updateValFromNumber(number);
  }

  // set the placeholder number type
  public setPlaceholderNumberType(type: string) {
      options.placeholderNumberType = type;
      this._updatePlaceholder();
  }

}
