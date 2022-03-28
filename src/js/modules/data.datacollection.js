import * as d3Array from 'd3-array'
import * as d3Fetch from 'd3-fetch'
import * as d3Dsv from 'd3-dsv'

const d3=Object.assign({},d3Array,d3Fetch,d3Dsv);

class DataCollection {

    static options = { delimiter: ',', mapper: d3.autoType, primary:undefined };

    constructor(id) {
        this.id = id;
        this._index = 0;
    }

    /**
     * Itérateur
     * @returns {{next: ((function(): ({value: *, done: boolean}))|*)}}
     */
    [Symbol.iterator]() {
        return {
            next: () => {
                if (this._index < this.dataset.length) {
                    return {value: this.dataset[this._index++], done: false};
                } else {
                    this._index = 0;
                    return {done: true};
                }
            }
        };
    }

    get dictionary(){
        return (this.datasetDict)?this.datasetDict:this.exportToDict();
    }

    get map(){
        return (this.datasetMap)?this.datasetDict:this.exportToMap();
    }

    primaryKey(keyName){
        this.primaryKey=keyName;
        return this;
    }

    /**
     * Charge les données
     * @returns {Promise<unknown>}
     */
    load(file,options={}) {
        this.ready=new Promise((resolve, reject) => {
            this.file=file;
            this.options={...DataCollection.options,...options};
            d3.text(`${this.file}`)
                .then((dataset) => {
                    dataset = d3.dsvFormat(this.options.delimiter).parse(dataset);
                    dataset = dataset.map(this.options.mapper);
                    this.push(dataset);
                    resolve(this);
                });
        });
        return this;
    }

    filter(fn) {
        if (!this.dataset) {
            throw('Aucune donnée à filtrer');
        }
        else {
            return new DataCollection(this.id + '_f').push(this.dataset.filter(fn));
        }
    }

    /**
     * Injecte des données dans l'instance
     * @param dataset : Array
     * @returns {DataCollection}
     */
    push(dataset,keyName='id') {
        if (!Array.isArray(dataset)) {
            if (dataset instanceof Map) dataset = this._importFromMap(dataset, keyName);
            else if (dataset.constructor === Object) dataset = this._importFromDict(dataset, keyName);
        }
        this.dataset = dataset;
        this.datasetDict=undefined;
        this.datasetMap=undefined;
        this.keys = (dataset.length) ? Object.keys(dataset[0]) : [];
        return this;
    }

    /**
     * Convertit un dictionnaire en array (en injectant la clé dans une colonne id)
     * @param dict
     * @returns {unknown[]}
     * @private
     */
    _importFromDict(dict, keyName) {
        return Object.entries(dict).map((d) => {
            d[1][keyName] = d[0];
            return d[1];
        });
    }

    _importFromMap(map, keyName = 'id') {
        return Array.from(map)
            .map( d=>  Object.assign({ [keyName]:d[0]},d[1]) );
    }

    /**
     * Renvoie un objet Dictionnaire ayant pour clé primaryKey (
     * @param primaryKey : String : si undefined, cherche une propriété this.primary, sinon défini à 'id' par défaut
     * @returns {*} : Map
     */
    exportToDict(primaryKey) {
        return this._export(primaryKey, 'Dictionary');
    }

    /**
     * Renvoie un objet Map ayant pour clé primaryKey (
     * @param primaryKey : String : si undefined, cherche une propriété this.primary, sinon défini à 'id' par défaut
     * @returns {*} : Map
     */
    exportToMap(primaryKey) {
        return this._export(primaryKey, 'Map');
    }

    /**
     * Méthode appelée par exportToMap et exportToDict
     * @param primaryKey
     * @param type
     * @returns {unknown}
     * @private
     */
    _export(primaryKey, type = 'Dictionary') {
        primaryKey = (typeof primaryKey !== 'undefined') ? primaryKey :
            (this.hasOwnProperty('primary')) ? this.primary :
                'id';
        const cloneRow = (row) => {
            //console.log(row);
            let clonedRow = Object.assign({}, row);
            delete (clonedRow[primaryKey]);
            return clonedRow;
        }


        if (type.toLowerCase() === 'map') {
            this.datasetMap=new Map();
            this.toGroups(primaryKey)
                .forEach( d => this.datasetMap.set(d[0],d[1]) );
            return this.datasetMap;
        }
        else if (type.toLowerCase() ==='dictionary') {
            this.datasetDict=new Object();
            this.toGroups(primaryKey)
                .forEach( d => this.datasetDict[d[0]]=d[1] );
            return this.datasetDict;
        }
        else return null;
    }

    toGroups(keys) {
        if (typeof keys === 'string') keys = [keys];
        let fns = keys.map((k) => (d) => d[k]),
            nested = d3.groups(this.dataset, ...fns);      //A vérifier que ça marche avec plusieurs clés...
        return nested;
    }

    /**
     * Applique une fonction à chaque ligne de données
     * @param fn {Function} : fonction
     * @returns {DataCollection}
     */
    each(fn) {
        this.dataset = this.dataset.map(fn);
        return this;
    }

    /**
     * Renvoie les données d'une colonne
     * @param key
     * @returns {*}
     */
    col(key) {
        return this.dataset.map((d) => d[key]);
    }

    /**
     * Renvoie une ligne de données
     * @param id
     * @returns {*}
     */
    row(id) {
        return (this.primary) ? this.dataset.find((d) => d[this.primary] === id) : this.dataset[id];
    }

    /**
     * Cherche et renvoie la ligne de données où key=value
     * @param key
     * @param value
     * @returns {*}
     */
    find(key, value) {
        if (arguments.length===1) {
            value=key;
            key = this.options.primary || 'id';
        }
        try {
            return (this.findAll(key,value)[0]);
        }
        catch(error){
            return null;
        }
    }

    /**
     * Cherche et renvoie les lignes de données où key=value
     * @param key
     * @param key
     * @param value
     * @returns {*}
     */
    findAll(key, value) {
        const result= this.dataset
            .filter(
                (d) => {
                    // if (value instanceof Date) console.log(d[key],value, !(d[key]<value || d[key]>value));
                    if (value instanceof Date) return !(d[key]<value || d[key]>value);
                    else if  (typeof value=='object') return Object.prototype.valueOf(d[key])===Object.prototype.valueOf(value);
                    else return d[key] === value;
                });
        return (result.length)?result:null;
    }

    /**
     * Renvoie les lignes de données situées immédiatement avant et après
     * @param key
     * @param value
     * @returns {DataCollection}
     */
    nearest(key,value) {
        const dataset=this.sort(key,'ascending',false);
        let [previous,next]=[undefined,undefined];
        dataset.every( d=> {
            if (d[key]<value) previous=d;
            else if (next===undefined && d[key]>value) {
                next=d;
                return false;
            }
            return true;
        });
        return [previous,next];
    }

    /**
     * Renvoie les valeurs extrêmes d'une colonne
     * @param key : String
     * @returns {*}  [min,max]
     */
    extent(key) {
        if (typeof key == 'string') {
            return d3.extent(this.col(key));
        } else if (Array.isArray(key)) {
            return [this.min(key[0]), this.max(key[1])];
        }
    }

    /**
     * Renvoie la valeur minimale d'une colonne
     * @param key {String} : clé
     * @returns {*} : Number
     */
    min(key) {
        return d3.min(this.col(key));
    }

    /**
     * Renvoie la valeur maximale d'une colonne
     * @param key {String} : clé
     * @returns {*} : Number
     */
    max(key) {
        return d3.max(this.col(key));
    }

    /**
     * Renvoie un tableau contenant les valeurs uniques d'une colonne
     * @param key
     * @returns {any[]}
     */
    unique(key){
        let values=this.col(key);
        if (values.some( d=> d instanceof Date)) {
            values=values.map(d=>d.getTime());
            return [...new Set(values)].map(d=>new Date(d));
        }
        else if (values.some( d=> typeof d==='object')){
            values=values.map(d=>JSON.stringify(d));
            return [...new Set(values)].map(d=>JSON.parse(d));
        }
        else return [...new Set(values)];
    }

    /**
     * Trie les données en fonction d'une clé
     * @param {String}  key : clé
     * @param {String} type : ascending ou descending
     * @param {Boolean} inPlace : indique si doit modifier l'ordre des données de l'instance (par défaut) ou juste renvoyer le résultat
     * @returns {DataCollection|*}
     */
    sort(key, type='descending', inPlace=true) {
        let dataset=this.dataset.sort((a, b) => d3[type](a[key], b[key]));
        if (inPlace) {
            this.dataset=dataset;
            return this;
        }
        else return dataset;
    }

    /**
     * Affiche les nb premières lignes des données dans la console
     * @param nb
     * @returns {DataFrame}
     */
    head(nb = 10) {
        return this._sample(0, nb);
    }

    /**
     * Méthode privée appelée par head
     * @param start
     * @param nb
     * @returns {DataFrame}
     * @private
     */
    _sample(start = 0, nb = 10) {
        const extract = this._slice(start, nb),
            lengths = Array(this.keys.length).fill(0);
        console.log(extract);
        extract.unshift(this.keys.reduce((a, v) => ({...a, [v]: v}), {}));
        for (let j = 0; j < this.keys.length; j++) {
            extract.forEach((row, i) => {
                if (extract[i][this.keys[j]] === null) extract[i][this.keys[j]] = 'null';
                else if (extract[i][this.keys[j]] === undefined) extract[i][this.keys[j]] = 'undefined';
                else extract[i][this.keys[j]] = extract[i][this.keys[j]].toString();
                lengths[j] = Math.max(lengths[j], extract[i][this.keys[j]].length);
            });
        }
        let string = "\r\n";
        extract.forEach((row) => {
            for (let j = 0; j < this.keys.length; j++) {
                string += row[this.keys[j]].padStart(lengths[j] + 2, ' ');
            }
            string += '\r\n';
        });
        console.log(string);
        return this;
    }

    _slice(start = 0, length) {
        length = length || (this.dataset.length - start);
        return this.dataset.slice(start, start + length);
    }


}
export {DataCollection}