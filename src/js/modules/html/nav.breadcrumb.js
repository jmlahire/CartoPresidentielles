import './../../../style/modules/html/navBreadcrumb.scss';

import * as d3Selection from 'd3-selection';
import * as d3Array from 'd3-array';
import * as d3Dispatch from 'd3-dispatch';
import * as deburr from 'lodash.deburr';
import {Component} from "./component";
import {DataCollection} from "../data/datacollection";

const d3=Object.assign({},d3Selection,d3Dispatch);



class abstractItem {
    constructor(index){
        this.index=index;
        this.dispatch=d3.dispatch('change');
        this.container=d3.create('li').classed('level',true);
    }
    render(){
        this.container.selectAll('*').remove();
        this.container.append( ()=> this.content.node());
        return this;
    }

    hide(){
        this.container.style('display','none');
        return this;
    }

    show(){
        this.container.style('display','list-item');
        return this;
    }
}

class labelItem extends abstractItem{
    constructor(index){
        super(index);
        this.content=d3.create('a');
    }
    data(label){
        this.content
            .text(label)
            .on('click', ()=> this.dispatch.call('change',this,{ index:this.index, value:label }));
        return this;
    }
}


class selectItem extends abstractItem{

    /**
     * CONSTRUCTEUR
     * @param {Number}          index
     */
    constructor(index){
        super(index);
        this.content = d3.create('select');
    }

    /**
     *
     * @param {DataCollection}  data
     * @param {Object}          options
     * @param {String}          options.valueKey
     * @param {String}          [options.placeHolder]
     * @param {String}          [options.nestKey]
     * @param {String}          [options.labelKey]
     */
    data(data,options={}){
        this.options=options;
        if (options.placeHolder)
            this.content.append('option')
                .attr('value', '')
                .property('disabled', true)
                .property('selected', true)
                .property('hidden', true)
                .text(options.placeHolder);
        if (options.nestKey) {
            data = data.toGroups(options.nestKey);
            this.content
                .selectAll('optgroup')
                .data(data, d => d[0])
                .enter()
                .append('optgroup')
                .attr('label', d => d[0].toUpperCase())
                .selectAll('option')
                .data(d => d[1])
                .enter()
                .append('option')
                .attr('value', d => d[options.valueKey])
                .text(d => d[options.labelKey])
        }
        this.content.on('change', (e)=> {
            this.select(e.target.value);
            this.dispatch.call('change',this, {index:this.index, value: e.target.value });
        });
        return this;
    }

    /**
     * Sélectionne une option (purement graphique, ne déclenche pas dispatch)
     * @param {String|Number} value         valeur de l'option à sélectionner
     * @param
     * @returns {selectItem}
     */
    select(value){
        this.content
            .classed('selected',true)
            .selectAll('option')
            .filter(d => d)
            .each( (d,i,n) => {
                const elt=d3.select(n[i]);
                if (d[this.options.valueKey]===value) elt.property('selected',true);
                else elt.attr('selected',null);
            });
        return this;
    }

    /**
     * Déselectionne toutes les options
     * @returns {selectItem}
     */
    deselect(){
        this.content.selectAll('option')
            .filter(d => d)
            .attr('selected',null);
        return this;
    }
}

class autocompleteItem extends abstractItem{

    /**
     *
     * @param {Number}          index
     */
    constructor(index){
        super(index);
        this.content = d3.create('span').classed('autocomplete',true);
        this._innerContent=this.content.append('div');
        this._input= this._innerContent.append('input');
        this._results=this._innerContent.append('div').classed('results',true)
                                        .append('ul');
    }

    /**
     *
     * @param {Array}           data
     * @param {Object}          options
     * @param {String}          options.valueKey
     * @param {String}          [options.placeHolder]
     * @param {String}          [options.nestKey]
     * @param {String}          [options.labelKey]
     */
    data(data,options){
        this.options=options;
        this._data=data.map( (row)=> {
            return { value:row[options.valueKey], label:row[options.labelKey], deburr:this._normalize(row[options.labelKey]) }
        } );
        if (options.placeHolder) this._input.attr('placeholder',options.placeHolder);
        let text='';
        this.results=[];
        this._input
            .on('input', (event) => {
                text=this._normalize(event.target.value);
                this.results=(text.length>2)?this._search(text):this._search(text,true);
                this._updateSelection(this.results);
                if (this.results.length) this._showResults();
                else this._hideResults();
            })
            .on('focus',(event)=> event.target.value='')
            .on('keydown',(event)=> {
                if (event.keyCode==13 && this.results.length) {
                    this._selectOption(this.results[0]);
                }
            });

    }

    /**
     * Donne le focus au champ imput
     * @returns {autocompleteItem}
     */
    focus(){
        this._input.node().focus();
        return this;
    }

    /**
     * Remet toute la classe à zéro (supprime data, options)
     * @returns {autocompleteItem}
     */
    reset(){
        delete(this.options);
        delete(this._data);
        this._results.selectAll('li').remove();
        this.setLabel('');
        return this;
    }

    /**
     * Insère un contenu dans l'élement input, à partir de son identifiant
     * @param {String|Number} value         id de l'élément dans this._data
     * @returns {autocompleteItem}
     */
    setValue(value){
        const data=this._data.find(d=>d.value===value);
        this._input.node().value=data.label;
        return this;
    }

    /**
     * Insère un contenu dans l'élement input
     * @param {String} text                 Texte à afficher
     * @returns {autocompleteItem}
     */
    setLabel(text){
        this._input.node().value=text;
        return this;
    }

    _normalize(text){
        return deburr.default(text).toLowerCase();
    }

    _search(text, exact=false){
        text=this._normalize(text);
        return (exact)? this._data.filter( (row) => row.deburr===text) : this._data.filter( (row) => row.deburr.search(text)>=0 );

    }
    _updateSelection(data) {
        const highlight= (string,substring) => {
                //TODO: Mettre en gras la sous chaine recherchée
        }
        this._results
            .selectAll('li')
            .data(data, d=>d.value)
            .join(
                enter=>enter.append('li')
                    .attr('value', d => d.value)
                    .html(d => d.label),
                update=>update
                    .attr('value', d => d.value)
                    .html(d => d.label),
                exit=>exit.remove()
            )
            .on('click', (e,d)=> this._selectOption(d));


    }

    /**
     * Methode appelée lorsque l'utilisateur clique sur une des options
     * @param {Object}  d         Données sélectionnées
     * @private
     */
    _selectOption(d){
        this.setLabel(d.label);
        this.dispatch.call('change',this,{index:this.index, value:d.value});
        this._hideResults();
    }


    /**
     * Cache la liste des propositions
     * @private
     */
    _hideResults(){
        this.content.select('div.results').classed('visible',false);
    }

    /**
     * Montre la liste des propositions
     * @private
     */
    _showResults(){
        this.content.select('div.results').classed('visible',true);
    }


}


class NavBreadcrumb extends Component{

    static type='_Breadcrumb';
    static defaultOptions={ delimiter:'>' };

    constructor(id, options={}){
        super(id);
        this.options= {...NavBreadcrumb.defaultOptions,...options};
        this.levels = new Array();
        this.dispatch=d3.dispatch('change');
        this._outerContainer=d3.create('nav').attr('id',this.id).classed(NavBreadcrumb.type,true);
        this._innerContainer=this._outerContainer.append('ul');
        this._index=0;
    }

    get innerContainer(){
        return this._innerContainer;
    }

    get outerContainer(){
        return this._outerContainer;
    }

    setLevel(index,type){
        if (type==='label') this.levels[index] = new labelItem(index);
        else if (type==='select') this.levels[index] = new selectItem(index);
        else if (type==='autocomplete') this.levels[index] = new autocompleteItem(index);
        return this;
    }

    getLevel(index){
        return this.levels[index];
    }

    showLevels(limit=this.levels.length){
        //TODO: A refactoriser, sale !
        this.innerContainer.selectAll('li.level')
            .each((d,i,n)=>{
                d3.select(n[i]).style('display', (i<limit)?'list-item':'none');
            })
        return this;
    }




    render(){
        this.innerContainer.selectAll('*').remove();
        this.levels.forEach( (lvl)=>{
            lvl.render();
            this.innerContainer.append( ()=> lvl.container.node());
            lvl.dispatch.on('change', (event)=> this.dispatch.call('change',this,event));
        });
        return this;
    }

}


export {NavBreadcrumb}