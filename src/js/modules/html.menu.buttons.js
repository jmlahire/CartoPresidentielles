import './../../style/htmlMenuButtons.scss';

import * as d3Selection from 'd3-selection';
import * as d3Array from 'd3-array';
import * as d3Dispatch from 'd3-dispatch';
import {HtmlComponent} from "./html.component";
import {InterTitle} from "./html.content.title";

const d3=Object.assign({},d3Selection,d3Dispatch,d3Array);


/**
 * Renvoie une série de boutons correspondant aux données passées en paramètre
 */
class HtmlMenuButtons extends HtmlComponent{

    static type='_Buttons';
    static defaultOptions = { label:'', style:'round' };

    /**
     * CONSTRUCTEUR
     * @param {String} [id]               identifiant
     * @param {Object} [options]          options
     * @param {String} [options.label]    titre affiché avant les boutons (optionnel)
     * @param {String} [options.style]    round  | square
     */
    constructor(id, options={ }){
        super(id);
        this.options = { ...HtmlMenuButtons.defaultOptions, ...options };
        this.dispatch=d3.dispatch('select');
        this.container=d3.create('nav')
            .attr('id',this.id)
            .classed(HtmlMenuButtons.type,true)
            .classed(this.options.style,true);
    }

    /**
     *
     * @param {DataCollection} data     Données
     * @param {Object} keys
     * @param {String} keys.img         Clé de l'image
     * @param {String} keys.value       Clé de la valeur à renvoyer en cas de sélection
     * @param {String} [keys.label]     Clé du texte à afficher (optionnel)
     * @param {String} [keys.color]     Clé de la couleur du cadre (optionnel)
     * @param {Object} [options]
     * @param {String} [options.check]  Icone "checked" avec extension (optionnel)
     * @param {String} [options.path]   Chemin relatif vers les images (optionnel)
     * @param {String} [options.ext]    Extension des images, jpg par défaut (optionnel)
     * @returns {HtmlMenuButtons}
     */
    data(data, keys, options={} ) {
        options = {...{ext: 'jpg', path: ''}, ...options};
        this._data = { data: data, keys: keys, options: options };
        return this;
    }


    /**
     * Affiche les boutons
     * @returns {HtmlMenuButtons}
     */
    render(){
        this.empty();
        const {data,keys,options}=this._data;
        if (this.options.label) new InterTitle('TitrePanneau').text('text',this.options.label).render().appendTo(this);
        const figure=this.container
                            .selectAll('figure')
                            .data(data)
                            .enter()
                            .append('figure')
                            .attr('class', d=>`_${d[keys.value]}`)
                            .on('click', (e,d) => this.select(d) );
        const img=figure.append('img')
                        .classed('photo',true)
                        .attr('src',d=>`${options.path}${d[keys.img]}.${options.ext}`)
                        .attr('alt',d=> d[keys.label]);
        if (keys.color) img.style('box-shadow',d=>`${d[keys.color]} 0 0 0 3px`);
        if (keys.label) figure.append('figcaption').text(d=>d[keys.label]);
        if (options.check) figure.append('img').classed('check',true).attr('src', `${options.path}${options.check}`);
        return this;
    }

    /**
     * Sélectionne un bouton
     * @param {Object|String|Number} datum      données associées à un bouton (appelé en général par methode interne) ou identifiant du boouton (appelé de l'extérieur)
     * @returns {HtmlMenuButtons}
     */
    select(datum){
        let keyValue=this._data.keys.value;
        if (typeof datum!=='object') datum=this._data.data.find(keyValue,datum);
        this.container.selectAll('figure')
            .classed('selected',d => d===datum);
        this.dispatch.call('select',datum,{value:datum[keyValue]});
        return this;
    }




}


export {HtmlMenuButtons}