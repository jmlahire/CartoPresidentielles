import '../../../style/modules/html/contentBox.scss';

import * as d3Selection from 'd3-selection';
import * as d3Scale from 'd3-scale';
import * as d3Drag from 'd3-drag';
import {Component} from "./component";
import {ContentTable} from "./content.table";


const d3=Object.assign({},d3Selection,d3Scale,d3Drag);


/**
 * Renvoie la position d'un node par rapport à l'origine de la page
 * @param obj
 * @returns {{x: number, y: number}}
 */
function findPos(obj) {
    let left = 0,
        top = 0;
    if (obj.offsetParent) {
        do {
            left += obj.offsetLeft;
            top += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return {x:left, y:top};
    }
}



class ContentBox extends Component{

    static type='_ContentBox';
    static defaultOptions = { closeButton:true, draggable:true, margins:{ top:5, right:30, bottom:5, left:5} };

    constructor(id, options={ }){
        super(id);
        options={...ContentBox.defaultOptions,...options};
        this.options=options;
        this._outerContainer = d3.create('div')
            .attr('id',this.id)
            .classed(ContentBox.type,true);
        this._title=this._outerContainer
            .append('h2')
            .classed('subtitle',true);
        this._innerContainer = this._outerContainer
            .append('div')
            .classed('inner',true);
        if (options.closeButton) {
            this._outerContainer.append('img')
                .classed('close',true)
                .attr('src','assets/img/close.svg')

                .on('click',()=>this.hide());
        }
        this._content=this._innerContainer
            .append('section')
            .classed('content',true);

        //Ajustement du positionnement
        this.offset = new Proxy({},{
                get:  (target, prop)=> {
                    return target[prop];
                },
                set: (target, prop, value)=> {
                    target[prop] = this._restrainDrag(value,prop);
               //     console.log(target[prop]);
                    this.outerContainer.style((prop=='x')?'left':'top', d =>  target[prop] + 'px');
                    return true;
                }} );
        //Drag
        if (options.draggable){
            const delta = {x: 0, y: 0};
            const onStart = (event)=> {
                this._title.classed('dragged',true);
                delta.x = event.x;
                delta.y = event.y;
            }
            const onDrag = (event) => {
                this.offset.x += event.x - delta.x;
                this.offset.y += event.y - delta.y;
            }
            const onEnd = ()=> {
                this._title.classed('dragged',false);
            }
            this._title.classed('draggable',true)
                .call(d3.drag()
                    .on("start", onStart)
                    .on("drag", onDrag)
                    .on("end", onEnd));
        }



    }

    get outerContainer(){
        return this._outerContainer;
    }

    get innerContainer(){
        return this._innerContainer;
    }

    get container(){
        return this._innerContainer;
    }

    get containerBounds() {
        let bounds = this.parentContainer.node().getBoundingClientRect();
        bounds.x += window.pageXOffset;
        bounds.y += window.pageYOffset;
        return bounds;
    }

    get bounds() {
        return this.outerContainer.node().getBoundingClientRect();
    }


    /**
     * Vérifie une coordonnée x ou y par rapport à la zone d'affichage théorique, et renvoie une coordonnée corrigée au besoin
     * @param {Number} coord        Coordonnée x ou y par rapport au contenur
     * @param {String} axis         'x' ou 'y'
     * @returns {String|*}
     */
    _restrainDrag(coord,axis='x'){
        const limits= {
            x: [this.options.margins.left, this.containerBounds.width - this.bounds.width - this.options.margins.left - this.options.margins.right],
            y: [this.options.margins.top, this.containerBounds.height - this.bounds.height- this.options.margins.top - this.options.margins.bottom]
        }
       // console.warn(limits, this.containerBounds.width, this.bounds.width);
        if (coord < limits[axis][0]) return limits[axis][0];
        else if (coord > limits[axis][1]) return limits[axis][1];
        else return coord;
    }


    reset(){
        this.title('');
        this._content.selectAll('*').remove();
        return this;
    }

    title(title){
        this._title.text(title);
        return this;
    }

    position(event){
        this.enqueue( () => new Promise((resolve, reject) => {
            let parentPos=findPos(this.parentContainer.node()),
                x = event.pageX  - parentPos.x,
                y = event.pageY - parentPos.y;
            this.offset.x = x;
            this.offset.y = y;
            resolve(this);
        }))
        return this;
    }


    table(){
        const table=new ContentTable();
        table.appendTo(this._content);
        return table;
    }

    text(text,format='text'){
        if (format==='html') this._content.append('text').html(text);
        else this._content.append('p').text(text);
        //
        return this;
    }

    add(component){
        this._content.append(()=>component.outerContainer.node());
        return this;
    }

    /**
     * Affiche la boite (et relance via le proxy this.offset une vérification des coordonnées pour que la boite reste dans le container)
     * @returns {ContentBox}
     */
    show(){
        Component.prototype.show.call(this);
        let {x,y}=this.offset;
        this.offset.x=x;
        this.offset.y=y;
        return this;
    }



}

export {ContentBox}