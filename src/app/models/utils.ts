// Import methods
import {
    parse,
    format,
    AsYouType,
    getNumberType,
    getPhoneCode,
    isValidNumber,
    isValidNumberCustom } from 'libphonenumber-js';

// Import type definitions
import { CountryCode, ParsedNumber, NumberFormat } from 'libphonenumber-js';
import { examples, numberTypes, validationError } from './allCountries.data';

// Import metadata
import {metadata} from './metadata.custom';


export class IntlTelInputUtils {

    numberType = numberTypes;

    contructor() {}

    AsYouTypeFormatter(number: string, countryCode?: string) {
        const upperCode = countryCode ? countryCode.toUpperCase() : '';
        const dynFormat = new AsYouType(upperCode as CountryCode);
        return dynFormat.input(number);
    }

    // format the given number to the given format
    formatNumber(number: string, countryCode: string, formatAs: string = 'E.164' ) {
        try {
            const numberObj = parse(number, countryCode.toUpperCase() as CountryCode);
            return format(numberObj, formatAs as NumberFormat);
        } catch (e) {
            return number;
        }
    }

    // get an example number for the given country code
    getExampleNumber(countryCode: string, nationalFormat: boolean, numberType) {
      try {
        /** TODO: CHECK IF IT IS REALLY NECESSARY TO GET THE PHONE NUMBER EXAMPLES
         *  FOR A SPECIFIC TYPE (MOBILE, FIXED-LINE ETC) SINCE WE ARE CURRENTLY
         *  USING ONLY MOBILE EXAMPLES...
         */

        const numberStr = this.getExampleNumberForType(countryCode.toUpperCase(), numberType);
        const formatAs = nationalFormat ? 'National' : 'International';
        return format(numberStr, countryCode.toUpperCase() as CountryCode, formatAs);
      } catch (e) {
        return '';
      }
    }

    getExampleNumberForType(countryCode: string, numberType: string): string {
        return examples[countryCode];
    }

    // get the extension from the given number
    getExtension(number: string, countryCode: string) {
          try {
            const numberObj = parse(number, countryCode.toUpperCase() as CountryCode);
            return numberObj.ext;
          } catch (e) {
            return '';
          }
    }

    // get the type of the given number e.g. fixed-line/mobile
    getNumberType(number: string, countryCode: string) {
        try {
            const numberObj = parse(number, countryCode.toUpperCase() as CountryCode);
            return getNumberType(numberObj);
        } catch (e) {
            // broken
            return -99;
        }
    }

    // get more info if the validation has failed e.g. too long/too short
    getValidationError(number: string, countryCode: string) {
        try {
            const numberObj = parse(number, countryCode.toUpperCase() as CountryCode);
            return isValidNumber(numberObj);
            // return phoneUtil.isPossibleNumberWithReason(numberObj);
        } catch (e) {
            console.log(e);

        /** TODO: CHECK FOR ERROR VALIDATION MESSAGES (IF ANY) */
        // here I convert thrown errors into ValidationResult enums (if possible)
        /*
        if (e.message == i18n.phonenumbers.Error.INVALID_COUNTRY_CODE) {
            return i18n.phonenumbers.PhoneNumberUtil.ValidationResult.INVALID_COUNTRY_CODE;
        }
        if (e.message == i18n.phonenumbers.Error.NOT_A_NUMBER) {
            return 4;
        }
        if (e.message == i18n.phonenumbers.Error.TOO_SHORT_AFTER_IDD || e == i18n.phonenumbers.Error.TOO_SHORT_NSN) {
            return i18n.phonenumbers.PhoneNumberUtil.ValidationResult.TOO_SHORT;
        }
        if (e.message == i18n.phonenumbers.Error.TOO_LONG) {
            return i18n.phonenumbers.PhoneNumberUtil.ValidationResult.TOO_LONG;
        }
        // broken
        return -99;
        */
        }
    }

    // check if given number is valid
    isValidNumber(number: string, countryCode: string) {
      try {
        const numberObj = parse(number, countryCode.toUpperCase() as CountryCode);
        return isValidNumber(numberObj);
      } catch (e) {
        return false;
      }
    }

    isValidNumberCustom(number: string, countryCode: string) {
        try {
            const numberObj = parse(number, countryCode.toUpperCase() as CountryCode);
            return isValidNumberCustom(numberObj, metadata);
        } catch (e) {
            return false;
        }
    }

}
