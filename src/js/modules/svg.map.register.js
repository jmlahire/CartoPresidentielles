class SvgMapRegister {
    constructor(){
        this.register=new Map();
    }

    has(id){
        return this.register.has(id);
    }
    get(id){
        return this.register.get(id);
    }
    add(id,mapLayer){
        this.register.set(id,mapLayer);
        return this;
    }
    delete(id){
        this.register.delete(id);
        return this;
    }
    checkAndReturn(id,mapLayer){
        if (this.register.has(id)) {
            return this.register.get(id);
        }
        else {
            this.register.set(id,mapLayer);
            return mapLayer;
        }
    }


}

const svgMapRegister=new SvgMapRegister();

export {svgMapRegister}