/**
 * Copyright 2011 by Stefaan Colman
 */

var BigDecimal = (function () {

    var bd = function (number) {
        number += '';

        var i = 0;

        this.digits = [];
        for (i = 0; i < digits(); i++) {
            this.digits[i] = 0;
        }

        this.startAt = 0;
        this.endAt   = digits() - 1;

        this.negative = false;
        if (number.charAt(0) == '-') {
            this.negative = true;
            number = number.substring(1);
        }

        var parts = number.split('.');
        var integer  = parts[0];
        var fraction = parts[1] || '';

        for (i = 0; i < integer.length; i++) {
            this.digits[bd.INTEGER_DIGITS - integer.length + i] = parseInt(integer.charAt(i));
        }
        for (i = 0; i < fraction.length; i++) {
            this.digits[bd.INTEGER_DIGITS + i] = parseInt(fraction.charAt(i));
        }

        compact(this);
    };

    // Constants

    bd.INTEGER_DIGITS  = 12;
    bd.FRACTION_DIGITS = 12;

    function digits() {
        return bd.INTEGER_DIGITS + bd.FRACTION_DIGITS;
    }

    function toBigDecimal (number) {
        if (number instanceof BigDecimal) {
            return number;
        }
        return new BigDecimal(number);
    }

    function compact(number) {
        var i = 0;
        number.startAt = 0;
        while (number.startAt < bd.INTEGER_DIGITS - 1 && number.digits[number.startAt] == 0) {
            number.startAt++;
        }
        number.endAt = number.digits.length - 1;
        while (number.endAt > bd.INTEGER_DIGITS && number.digits[number.endAt] == 0) {
            number.endAt--;
        }
    }

    bd.prototype.toString = function () {
        var i = 0;
        var num = this.negative ? '-' : '';

        for (i = this.startAt; i < bd.INTEGER_DIGITS; i++) {
            num += this.digits[i];
        }
        num += '.';

        for (i = bd.INTEGER_DIGITS; i <= this.endAt; i++) {
            num += this.digits[i];
        }

        return num;
    };

    bd.prototype.negate = function () {
        var num = new BigDecimal(this.toString());
        num.negative = ! this.isZero() && ! num.negative;
        return num;
    };

    bd.prototype.isZero = function () {
        return this.startAt == bd.INTEGER_DIGITS - 1 && this.digits[this.startAt] == 0 && this.endAt == bd.INTEGER_DIGITS && this.digits[this.endAt] == 0;
    };

    bd.prototype.isOne = function () {
        return this.startAt == bd.INTEGER_DIGITS - 1 && this.digits[this.startAt] == 1 && this.endAt == bd.INTEGER_DIGITS && this.digits[this.endAt] == 0;
    };

    bd.prototype.zerosBefore = function (digit) {
        if (this.isZero()) {
            return true;
        }
        if (digit < this.startAt) {
            return true;
        }
        if (this.startAt == bd.INTEGER_DIGITS - 1 && this.digits[this.startAt] == 0) {
            for (var  i = bd.INTEGER_DIGITS; i < digit; i++) {
                if (this.digits[i] != 0) {
                    return false;
                }
            }
            return true;
        }


        return false;
    };

    bd.prototype.lowerThanIgnoreCase = function (number) {
        // only digits after . ?
        if (this.startAt == bd.INTEGER_DIGITS - 1 && this.digits[this.startAt] == 0) {
            if (number.startAt < bd.INTEGER_DIGITS - 1 || number.digits[number.startAt] != 0) {
                return true;
            }
            else {
                // Check each digit until not equal
                for (var i = bd.INTEGER_DIGITS; i < digits(); i++) {
                    if (this.digits[i] != number.digits[i]) {
                        return this.digits[i] < number.digits[i];
                    }
                }
                return false;
            }
        }
        else if (number.startAt == bd.INTEGER_DIGITS - 1 && number.digits[number.startAt] == 0) {
            return false;
        }
        else if (this.startAt == number.startAt) {
            return this.digits[this.startAt] < number.digits[number.startAt];
        }

        return this.startAt > number.startAt;
    };

    bd.prototype.add = function (number) {
        number = toBigDecimal(number);

        if (this.isZero()) {
            return number;
        }
        else if (number.isZero()) {
            return this;
        }

        var result = new BigDecimal('0.0');
        result.startAt = Math.min(this.startAt, number.startAt);
        result.endAt   = Math.max(this.endAt, number.endAt);

        var sum = true;

        var bigger  = this;
        var smaller = number;

        if (this.negative == number.negative) {
            result.negative = this.negative;
        }
        else {
            sum = false;

            if (this.lowerThanIgnoreCase(number)) {
                bigger  = number;
                smaller = this;
                result.negative = number.negative;
            }
            else {
                result.negative = this.negative;
            }
        }

        var overflow = 0;
        var rest, diff;
        for (var i = result.endAt; i >= result.startAt; i--) {
            if (sum) {
                result.digits[i] = this.digits[i] + number.digits[i] + overflow;
                if (result.digits[i] < 10) {
                    overflow = 0;
                }
                else {
                    rest = result.digits[i] - 10;
                    overflow = (result.digits[i] - rest) / 10;
                    result.digits[i] = rest;
                }
            }
            else {
                diff = bigger.digits[i] - smaller.digits[i] - overflow;
                if (diff < 0) {
                    result.digits[i] = 10 + diff;
                    overflow = 1;
                }
                else {
                    result.digits[i] = diff;
                    overflow = 0;
                }
            }
        }

        if (overflow != 0) {
            result.startAt--;
            result.digits[result.startAt] = overflow;
        }

        compact(result);

        return result;
    };

    bd.prototype.subtract = function (number) {
        number = toBigDecimal(number);
        return this.add(number.negate());
    };

    bd.prototype.multiply = function (number) {
        number = toBigDecimal(number);

        // * 0
        if (this.isZero()) {
            return this;
        }
        else if (number.isZero()) {
            return number;
        }

        // * 1
        if (this.isOne()) {
            return number;
        }
        else if (number.isOne()) {
            return this;
        }

        var result = new BigDecimal('0.0');
        result.startAt = Math.min(this.startAt, number.startAt);
        result.endAt   = Math.max(this.endAt, number.endAt);

        var overflow = 0;
        var times    = 0;
        var rest     = 0;
        var corr     = bd.INTEGER_DIGITS - number.endAt - 1;
        console.log(this.toString() + '*' + number.toString() + ' => ' + corr);

        for (var kol = number.endAt; kol >= number.startAt; kol--) {
            if (number.digits[kol] != 0) {
                for (var i = this.endAt; i >= this.startAt; i--) {
                    times = result.digits[i - corr] + (this.digits[i] * number.digits[kol]) + overflow;
                    if (times < 10) {
                        result.digits[i - corr] = times;
                        overflow = 0;
                    }
                    else {
                        rest = times % 10;
                        overflow = (times - rest) / 10;
                        result.digits[i - corr] = rest;
                    }
                }

                for(var i = this.startAt - 1; overflow > 0 && i - corr >= 0; i--) {
                    rest = overflow % 10;
                    overflow = (overflow - rest) / 10;
                    result.digits[i - corr] = rest;
                }
            }
            corr++;
        }

        console.log(result);
        compact(result);

        return result;
    };


    return bd;
})();