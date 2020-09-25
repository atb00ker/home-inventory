import { FormControl, ValidationErrors } from '@angular/forms';

export function JsonValidator(control: FormControl): ValidationErrors | null {
    try {
        let value = control.value;
        if (value !== '') {
            JSON.parse(control.value);
        }
    } catch (error) {
        return { jsonInvalid: true };
    }
    return null;
};
