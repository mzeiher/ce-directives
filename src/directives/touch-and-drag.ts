import { directive, Part, EventPart } from 'ce-decorators';

export type Gesture = 'mouse' | 'pointer' | 'touch';

const partMap: WeakMap<Part, boolean> = new WeakMap();
const supportedGesture: Gesture = 'onpointermove' in document ? 'pointer' : 'ontouchstart' in document ? 'touch' : 'mouse';

export interface TouchAndDragEvent {
    pointerId: symbol;
    clientX: number;
    clientY: number;
    originalEvent: MouseEvent | TouchEvent | PointerEvent;
    gestureType: Gesture;
    target: EventTarget;
    type: 'start' | 'end' | 'move' | 'cancel';
}

export interface TouchAndDragEventHandler {
    handleEvent(event: TouchAndDragEvent): void;
}

export const touchAndDrag = directive((handler: TouchAndDragEventHandler, forceGesture: Gesture = supportedGesture) => (part: Part | HTMLElement) => {
    if ((part instanceof EventPart && !partMap.has(part)) || part instanceof HTMLElement) {
        switch (forceGesture) {
            case 'pointer':
                attachPointerHandler(part, handler);
                break
            case 'touch':
                attachTouchHandler(part, handler);
                break
            default:
                attachMouseHandler(part, handler);
                break
        }
    }
});

function attachPointerHandler(part: EventPart | HTMLElement, eventHandler: TouchAndDragEventHandler) {
    const element = part instanceof HTMLElement ? part : part.element;
    element.addEventListener('pointerdown', (event: PointerEvent) => {
        event.preventDefault();

        const handler = {
            internalPointer: event.pointerId,
            uniquePointer: Symbol('pointer' + event.pointerId),
            handleEvent: function (event: PointerEvent) {
                if (event.pointerId !== this.internalPointer) return;
                event.preventDefault();
                if (event.type === 'pointermove') {
                    eventHandler.handleEvent(pointerEventToTouchAndDragEvent(event, 'move', handler.uniquePointer));
                } else if (event.type === 'pointerup' || event.type === 'pointercancel') {
                    eventHandler.handleEvent(pointerEventToTouchAndDragEvent(event, event.type === 'pointerup' ? 'end' : 'cancel', handler.uniquePointer));
                    ['pointermove', 'pointerup', 'pointercancel'].forEach(value => document.removeEventListener(value, <any>this));
                }
            }
        };
        ['pointermove', 'pointerup', 'pointercancel'].forEach(value => document.addEventListener(value, <any>handler));
        eventHandler.handleEvent(pointerEventToTouchAndDragEvent(event, 'start', handler.uniquePointer));

    });
}

function pointerEventToTouchAndDragEvent(event: PointerEvent, type: 'start' | 'end' | 'move' | 'cancel', uniquePointer: symbol): TouchAndDragEvent {
    return {
        clientX: event.clientX,
        clientY: event.clientY,
        gestureType: 'pointer',
        originalEvent: event,
        pointerId: uniquePointer,
        target: event.target,
        type,
    }
}

function attachTouchHandler(part: EventPart | HTMLElement, eventHandler: TouchAndDragEventHandler) {
    const element = part instanceof HTMLElement ? part : <HTMLElement>part.element;
    const uniquePointer = Symbol('pointer' + Math.random())

    element.addEventListener('touchstart', (event: TouchEvent) => {
        event.preventDefault();
        const handler = {
            internalPointer: Array.from(event.targetTouches),
            uniquePointer: uniquePointer,
            lastPointerId: -1,
            handleEvent: function (event: TouchEvent) {
                if (this.uniquePointer !== uniquePointer) return;
                const allTouches = Array.from(event.changedTouches).concat(Array.from(event.touches));
                const touchID = touchIsInList(allTouches, this.internalPointer);
                event.preventDefault();
                if (event.type === 'touchmove') {
                    eventHandler.handleEvent(touchEventToTouchAndDragEvent(event, allTouches, 'move', handler.uniquePointer, touchID));
                    this.lastPointerId = touchID;
                    console.log(event.type, this.uniquePointer, touchID);
                } else if (event.type === 'touchend' || event.type === 'touchcancel') {
                    console.log(event.type, this.uniquePointer, this.lastPointerId);
                    console.log(event);
                    ['touchmove', 'touchend', 'touchcancel'].forEach(value => window.removeEventListener(value, <any>this));
                    eventHandler.handleEvent(touchEventToTouchAndDragEvent(event, allTouches, event.type === 'touchend' ? 'end' : 'cancel', handler.uniquePointer, touchID < 0 ? this.lastPointerId : touchID));
                }
            }
        };
        ['touchmove', 'touchend', 'touchcancel'].forEach(value => window.addEventListener(value, <any>handler));
        const allTouches = Array.from(event.changedTouches).concat(Array.from(event.touches));
        eventHandler.handleEvent(touchEventToTouchAndDragEvent(event, allTouches, 'start', handler.uniquePointer, touchIsInList(allTouches, handler.internalPointer)));

    });
}

function touchIsInList(touches: Array<Touch>, targetTouches: Array<Touch>): number {
    for (let i = 0; i < touches.length; i++) {
        for (let targetTouch of targetTouches) {
            if (touches[i].identifier === targetTouch.identifier) {
                return i;
            }
        }
    }
    return -1;
}

function touchEventToTouchAndDragEvent(event: TouchEvent, allTouches: Array<Touch>, type: 'start' | 'end' | 'move' | 'cancel', uniquePointer: symbol, touchIndex: number): TouchAndDragEvent {
    return {
        clientX: allTouches[touchIndex].clientX,
        clientY: allTouches[touchIndex].clientY,
        gestureType: 'pointer',
        originalEvent: event,
        pointerId: uniquePointer,
        target: event.target,
        type,
    }
}

function attachMouseHandler(part: EventPart | HTMLElement, eventHandler: TouchAndDragEventHandler) {
    const element = part instanceof HTMLElement ? part : part.element;
    element.addEventListener('mousedown', (event: MouseEvent) => {
        event.preventDefault();

        const handler = {
            internalPointer: 0,
            uniquePointer: Symbol('mouse' + Math.random()),
            handleEvent: function (event: MouseEvent) {
                event.preventDefault();
                if (event.type === 'mousemove') {
                    eventHandler.handleEvent(mouseEventToTouchAndDragEvent(event, 'move', handler.uniquePointer));
                } else if (event.type === 'mouseup') {
                    eventHandler.handleEvent(mouseEventToTouchAndDragEvent(event, 'end', handler.uniquePointer));
                    ['mousemove', 'mouseup'].forEach(value => document.removeEventListener(value, <any>this));
                }
            }
        };
        ['mousemove', 'mouseup'].forEach(value => document.addEventListener(value, <any>handler));
        eventHandler.handleEvent(mouseEventToTouchAndDragEvent(event, 'start', handler.uniquePointer));

    });
}

function mouseEventToTouchAndDragEvent(event: MouseEvent, type: 'start' | 'end' | 'move' | 'cancel', uniquePointer: symbol): TouchAndDragEvent {
    return {
        clientX: event.clientX,
        clientY: event.clientY,
        gestureType: 'mouse',
        originalEvent: event,
        pointerId: uniquePointer,
        target: event.target,
        type,
    }
}