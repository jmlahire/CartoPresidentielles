import * as d3Selection from 'd3-selection';
import * as d3Scale from 'd3-scale';
import * as d3Drag from 'd3-drag';
import {HtmlComponent} from "./html.component";

const d3=Object.assign({},d3Selection,d3Scale,d3Drag);

class HtmlContentBox extends HtmlComponent{

    static type='HtmlContentBox';

    constructor(id, options={ closeButton:true, draggable:true }){
        super(id);
        this._outerContainer = d3.create('div')
            .attr('id',this.id)
            .classed(HtmlContentBox.type,true);
        this._title=this._outerContainer
            .append('h2')
            .classed('subtitle',true);
        this._innerContainer = this._outerContainer
            .append('div')
            .classed('inner',true);
        if (options.closeButton) {
            this._outerContainer.append('p')
                .classed('close',true)
                .text('X')
                .on('click',()=>this.hide());
        }
        this._text=this._innerContainer
            .append('section')
            .classed('content',true);
        const limitsFn = (value, limits) => {
            if (value < limits[0]) return limits[0];
            else if (value > limits[1]) return limits[1];
            return value;
        }
        const offsetHandler = {
            get: function (target, prop) {
                return target[prop];
            }.bind(this),
            set: function (target, prop, value) {
                const   coordToCss = {'x': 'left', 'y': 'top'};
                let        limits = [];
                if (prop === 'x') limits = [this.containerBounds.left, this.containerBounds.right - this.bounds.width];
                else if (prop === 'y') limits = [this.containerBounds.top, this.containerBounds.bottom - this.bounds.height];
                value = (value<limits[0])?limits[0]:(value>limits[1])?limits[1]:value;
                target[prop] = value;
                this.outerContainer.style(coordToCss[prop], d => value + 'px');
                return true;
            }.bind(this)
        }
        this.offset = new Proxy({}, offsetHandler);
        if (options.draggable){
            const delta = {x: 0, y: 0};
            const onStart = (event)=> {
                delta.x = event.x;
                delta.y = event.y;
            }
            const onDrag = (event) => {
                this.offset.x += event.x - delta.x;
                this.offset.y += event.y - delta.y;
            }
            const onEnd = ()=> { }
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

    get size(){
        return this._outerContainer.node().getBoundingClientRect();
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


    reset(){
        this.title('');
        this._text.selectAll('*').remove();
        return this;
    }

    title(title){
        this._title.text(title);
        return this;
    }

    position(event){
        this.enqueue( () => new Promise((resolve, reject) => {
            let x = event.clientX + window.pageXOffset,
                y = event.clientY + window.pageYOffset;
            this.offset.x = x;
            this.offset.y = y;
            resolve(this);
        }))
        return this;
    }


    table(data, fn){
        this.enqueue( () => new Promise((resolve, reject) => {
            const rows = this._text
                .append('table')
                .selectAll('tr')
                .data(data)
                .enter()
                .append('tr')
                .html(fn);
            resolve(this);
        }))
        return this;

    }



}

export {HtmlContentBox}