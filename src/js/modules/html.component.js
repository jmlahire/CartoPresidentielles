import * as d3Selection from 'd3-selection'
import {idGenerator} from './fn.idgenerator.js'
import {Queue} from './fn.queue.js'

const d3=Object.assign({},d3Selection);


class HtmlComponent extends Queue{

    static type='HtmlComponent';

    /**
     * Constructeur
     * @param id
     */
    constructor(id) {
        super();
        this.id = id || idGenerator().next().value;
        this.state = { visible: undefined };
    }

    get outerContainer(){
        return this.container;
    }

    get innerContainer(){
        return this.container;
    }

    append(tag='div', id, classes) {
        return (!this.container) ?  null:
                                    this.container
                                        .append(tag)
                                        .attr('id',id)
                                        .attr('class',classes);
    }

    appendTo(parent) {
        if (!this.outerContainer)
            console.warn(`Pas de conteneur défini pour ${this.id}`);
        else {
            if (parent instanceof HtmlComponent) {
                this.parentComponent=parent;
                this.parentContainer=parent.container;
            }
            else if (typeof parent === 'string')
                this.parentContainer=d3.select(`${parent}`);
            else
                this.parentContainer = d3.select('body');

            try {
                this.parentContainer.append(() => this.outerContainer.node());
            } catch (error) {
                this.appendTo(null);
            }
        }
        return this;
    }



    fadeOut(options= { duration:500,delay:0 } ) {
        this.enqueue( () => new Promise((resolve, reject) => {
            this.outerContainer
                    .transition()
                    .duration(options.duration)
                    .delay(options.delay)
                    .style('opacity',0)
                    .on('end', ()=> {
                        this.hide();
                        resolve( {msg:'hidden',target:this });
                    });
            }
        ));
        return this;
    }

    fadeIn(options= { duration:500,delay:0 }) {
        this.enqueue( () => new Promise((resolve, reject) => {
            this.outerContainer
                .transition()
                .duration(options.duration)
                .delay(options.delay)
                .style('opacity',1)
                .on('start', this.show.bind(this) )
                .on('end', () => resolve( {msg:'showed',target: this }) );
        }));
        return this;
    }

    show(){
        this.state.visible=true;
        this.outerContainer.style('display','block').style('opacity',1);
        return this;
    }

    hide(){
        this.state.visible=false;
        this.outerContainer.style('display','none');
        return this;
    }

    lower(){
        this.outerContainer.lower();
        return this;
    }
    raise(){
        this.outerContainer.raise();
        return this;
    }
}

class TitleComponent extends HtmlComponent{
    constructor(id, options ={ tag:'h1', class:'title'} ) {
        super(id);
        this.container=d3.create(options.tag)
                            .attr('id',id)
                            .classed(options.class,true);
    }
    text(string='', options= { format: 'text' }){
        if (options.format==='html') this.container.html(string);
        else this.container.text(string);
        return this;
    }
    delete(){
        return this.text();
    }
}

class Title extends TitleComponent{
    constructor(id){
        super(id,{ tag:'h1', class:'title'});
    }
}
class SubTitle extends TitleComponent{
    constructor(id){
        super(id,{ tag:'h2', class:'subtitle'});
    }
}
class InterTitle extends TitleComponent{
    constructor(id){
        super(id,{ tag:'h4', class:'intertitle'});
    }
}



export {HtmlComponent,Title,SubTitle,InterTitle}