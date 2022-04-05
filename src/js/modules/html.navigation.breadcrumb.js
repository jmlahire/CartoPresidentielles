import './../../style/htmlNavigationBreadcrumb.scss';

import * as d3Selection from 'd3-selection';
import * as d3Array from 'd3-array';
import * as d3Dispatch from 'd3-dispatch';
import {HtmlComponent} from "./html.component";
import {DataCollection} from "./data.datacollection";

const d3=Object.assign({},d3Selection,d3Dispatch);


/**
 * Factory
 */
class itemFactory {
    /**
     *
     * @param {Number} index
     * @param {String|DataCollection} data
     * @param {Object} [options]
     * @returns {*}
     */
    constructor(index,data,options){
        if (typeof data==='string') return new labelItem(index,data);
        else if (data instanceof DataCollection) return new selectItem(index,data,options);
        else console.warn('Impossible de créer l\'item');
    }
}

class abstractItem {
    constructor(index){
        this.index=index;
        this.dispatch=d3.dispatch('change');
    }
}

class labelItem extends abstractItem{
    constructor(index,label){
        super(index);
        this.content=label;

    }
    render(){
        this.container.append('a')
            .text(this.content)
            .on('click', ()=> this.dispatch.call('change',this,{ index:this.index, value:this.content }));
        return this;
    }
}

class selectItem extends abstractItem{
    /**
     *
     * @param {Number}          index
     * @param {DataCollection}  data
     * @param {Object}          options
     * @param {String}          options.valueKey
     * @param {String}          [options.placeHolder]
     * @param {String}          [options.nestKey]
     * @param {String}          [options.labelKey]
     */
    constructor(index,data,options={}){
        super(index);
        this.options = options;
        this.content = (data instanceof DataCollection) ? this._createSelect(data,options):null;
    }

    _createSelect(data,options) {
        const selector = d3.create('select');
        if (options.placeHolder)
            selector.append('option')
                .attr('value', '')
                .property('disabled', true)
                .property('selected', true)
                .property('hidden', true)
                .text(options.placeHolder);
        if (options.nestKey) {
            data = data.toGroups(options.nestKey);
            selector
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
        return selector;
    }

    render(){
        this.container.append( () => this.content.node())
            .on('change', (e)=> //e.stopPropagation();

                this.select(e.target.value));
        return this;
    }

    /**
     * Sélectionne une option
     * @param {String|Number} value         valeur de l'option à sélectionner
     * @returns {selectItem}
     */
    select(value){
        this.content.selectAll('option')
            .filter(d => d)
            .each( (d,i,n) => {
                const elt=d3.select(n[i]);
                if (d[this.options.valueKey]===value) elt.property('selected',true);
                else elt.attr('selected',null);
            });
        this.content.classed('selected',true);
        this.dispatch.call('change',this, {index:this.index, value: value });
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


class inputItem extends abstractItem{
    constructor(index,data,options){
        super(index);
        this.content = null;
    }
}


class HtmlNavigationBreadcrumb extends HtmlComponent{

    static type='_breadcrumb';
    static defaultOptions={ delimiter:'>' };

    constructor(id, options={}){
        super(id);
        this.options= {...HtmlNavigationBreadcrumb.defaultOptions,...options};
        this.levels = new Array();
        this.dispatch=d3.dispatch('change');
        this._outerContainer=d3.create('nav').attr('id',this.id).classed('_breadcrumb',true);
        this._innerContainer=this._outerContainer.append('ul');
        this._index=0;
        this._active=0;
    }

    get innerContainer(){
        return this._innerContainer;
    }

    get outerContainer(){
        return this._outerContainer;
    }

    level(index,values,options={}){
        if (arguments.length===1){
            return this.levels[index];
        }
        else {
            this.levels[index] = new itemFactory(index, values,options);
            return this;
        }

    }





    render(){
        this.innerContainer.selectAll('*').remove();
        this.levels.forEach( (lvl)=>{
            lvl.container=this.innerContainer.append('li');
            lvl.render();
            lvl.dispatch.on('change', (event)=> this.dispatch.call('change',this,event));
        });
        return this;
    }

}


export {HtmlNavigationBreadcrumb}