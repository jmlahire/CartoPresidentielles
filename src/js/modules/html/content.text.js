import '../../../style/modules/html/contentText.scss';

import * as d3Selection from 'd3-selection'
import {Component} from "./component";

const d3=Object.assign({},d3Selection);


/**
 * CLASSE ABSTRAITE SERVANT DE BASE A LA TITRAILLE
 */
class ContentText extends Component{


    static type = '_Text';
    static defaultOptions = { tag:'h1', class:'title', spans:['text']};

    /**
     * CONSTRUCTEUR
     * @param id
     * @param options
     */
    constructor(id, options) {
        super(id);
        options = {...ContentText.defaultOptions, ...options};
        this.spans = new Map();
        options.spans.forEach( s => this.spans.set(s,['',[]]) );
        this.container=d3.create(options.tag)
            .attr('id',id)
            .classed(options.class,true);
    }

    /**
     * Définit le contenu d'un des spans du titre
     * @param span {String} : identifiant du span
     * @param content {String} : texte
     * @param style {Array} : styles à applique au span (optionnel)
     * @returns {ContentText}
     */
    text(span='text',content='',style=[],format='text'){
        if (format!=='html') format='text';
        this.spans.set(span, {content:content,style:style,format:format});
        return this;
    }

    /**
     * Affiche le titre
     * @returns {ContentText}
     */
    render(){
        this.spans.forEach( (value) => {
            const   spanContainer = d3.create('div'),
                    spanContent = spanContainer.append('span')[value.format](value.content);
            if (value.style.length){
                value.style.forEach( rule => {
                    rule=rule.split(':');
                    spanContent.style(rule[0],rule[1]);
                });
                value.fcontent = spanContainer.node().innerHTML;
            }
            else {
                value.fcontent = (value.format==='html')? spanContent.node().innerHTML : spanContent.node().innerText;
            }
        });
        const spans = Array.from(this.spans.values())
                            .map(d=>d.fcontent)
                            .join(' ');
        this.container.html(spans).lower();
        return this;
    }

    /**
     * Vide le contenu du titre
     * @returns {ContentText}
     */
    empty(){
        this.container.selectAll('span').remove();
        return this;
    }

    /**
     * Supprime le composant titre dans le DOM
     * @returns {ContentText}
     */
    delete(){
        this.container.remove();
        return this;
    }
}




class Title extends ContentText{
    constructor(id, spans= ['text']){
        super(id,{ tag:'h1', class:'title', spans:spans });
    }
}
class SubTitle extends ContentText{
    constructor(id, spans= ['text']){
        super(id,{ tag:'h2', class:'subtitle', spans:spans });
    }
}
class InterTitle extends ContentText{
    constructor(id, spans= ['text']){
        super(id,{ tag:'h3', class:'intertitle', spans:spans });
    }
}

class Text extends ContentText{
    constructor(id, spans= ['text']){
        super(id,{ tag:'p', class:'intertitle', spans:spans });
    }
}



export {Title,SubTitle,InterTitle,ContentText}