
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next, lookup.has(block.key));
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Sections\Navbar.svelte generated by Svelte v3.20.1 */

    const file = "src\\Sections\\Navbar.svelte";

    function create_fragment(ctx) {
    	let nav;
    	let h1;
    	let t0;
    	let span0;
    	let t2;
    	let span1;
    	let t4;
    	let div;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			h1 = element("h1");
    			t0 = text("K");
    			span0 = element("span");
    			span0.textContent = "ANBAN";
    			t2 = text("\r\n    M");
    			span1 = element("span");
    			span1.textContent = "OTION";
    			t4 = space();
    			div = element("div");
    			attr_dev(span0, "class", "svelte-1r2xh60");
    			add_location(span0, file, 31, 5, 476);
    			attr_dev(span1, "id", "right");
    			attr_dev(span1, "class", "svelte-1r2xh60");
    			add_location(span1, file, 32, 5, 501);
    			add_location(h1, file, 30, 2, 465);
    			attr_dev(nav, "class", "svelte-1r2xh60");
    			add_location(nav, file, 29, 0, 456);
    			attr_dev(div, "class", "svelte-1r2xh60");
    			add_location(div, file, 35, 0, 549);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, h1);
    			append_dev(h1, t0);
    			append_dev(h1, span0);
    			append_dev(h1, t2);
    			append_dev(h1, span1);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Navbar", $$slots, []);
    	return [];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    /* src\UI\Card.svelte generated by Svelte v3.20.1 */
    const file$1 = "src\\UI\\Card.svelte";

    // (72:8) Empty Card
    function fallback_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Empty Card");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(72:8) Empty Card",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let article;
    	let h3;
    	let t0;
    	let t1;
    	let button;
    	let t3;
    	let article_intro;
    	let article_outro;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			article = element("article");
    			h3 = element("h3");
    			t0 = text(/*title*/ ctx[1]);
    			t1 = space();
    			button = element("button");
    			button.textContent = "x";
    			t3 = space();
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr_dev(button, "class", "svelte-1gd8pl");
    			add_location(button, file$1, 63, 4, 1200);
    			attr_dev(h3, "class", "svelte-1gd8pl");
    			toggle_class(h3, "newCardTitle", /*newCard*/ ctx[2]);
    			add_location(h3, file$1, 61, 2, 1148);
    			attr_dev(article, "id", /*id*/ ctx[0]);
    			attr_dev(article, "class", "svelte-1gd8pl");
    			toggle_class(article, "newCard", /*newCard*/ ctx[2]);
    			add_location(article, file$1, 56, 0, 1035);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, article, anchor);
    			append_dev(article, h3);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(h3, button);
    			append_dev(article, t3);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(article, null);
    			}

    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 2) set_data_dev(t0, /*title*/ ctx[1]);

    			if (dirty & /*newCard*/ 4) {
    				toggle_class(h3, "newCardTitle", /*newCard*/ ctx[2]);
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 64) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[6], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null));
    				}
    			}

    			if (!current || dirty & /*id*/ 1) {
    				attr_dev(article, "id", /*id*/ ctx[0]);
    			}

    			if (dirty & /*newCard*/ 4) {
    				toggle_class(article, "newCard", /*newCard*/ ctx[2]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);

    			add_render_callback(() => {
    				if (article_outro) article_outro.end(1);
    				if (!article_intro) article_intro = create_in_transition(article, fade, { duration: /*introtime*/ ctx[4] });
    				article_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			if (article_intro) article_intro.invalidate();
    			article_outro = create_out_transition(article, fade, { duration: /*outrotime*/ ctx[5] });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			if (detaching && article_outro) article_outro.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { id } = $$props;
    	let { title = "" } = $$props;
    	let { newCard = false } = $$props;
    	let introtime = 400;
    	let outrotime = newCard ? 0 : 400;
    	const writable_props = ["id", "title", "newCard"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Card", $$slots, ['default']);

    	const click_handler = () => {
    		dispatch("deleteCard", id);
    	};

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("newCard" in $$props) $$invalidate(2, newCard = $$props.newCard);
    		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		fade,
    		dispatch,
    		id,
    		title,
    		newCard,
    		introtime,
    		outrotime
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("newCard" in $$props) $$invalidate(2, newCard = $$props.newCard);
    		if ("introtime" in $$props) $$invalidate(4, introtime = $$props.introtime);
    		if ("outrotime" in $$props) $$invalidate(5, outrotime = $$props.outrotime);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		id,
    		title,
    		newCard,
    		dispatch,
    		introtime,
    		outrotime,
    		$$scope,
    		$$slots,
    		click_handler
    	];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { id: 0, title: 1, newCard: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[0] === undefined && !("id" in props)) {
    			console.warn("<Card> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get newCard() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set newCard(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\UI\Task.svelte generated by Svelte v3.20.1 */
    const file$2 = "src\\UI\\Task.svelte";

    // (105:2) {#if !firstCard}
    function create_if_block_1(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "←";
    			attr_dev(button, "id", "btnLeft");
    			attr_dev(button, "class", "btnArrow svelte-1iu8fh3");
    			add_location(button, file$2, 105, 4, 2069);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[11], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(105:2) {#if !firstCard}",
    		ctx
    	});

    	return block;
    }

    // (115:2) {#if !lastCard}
    function create_if_block(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "→";
    			attr_dev(button, "id", "btnRight");
    			attr_dev(button, "class", "btnArrow svelte-1iu8fh3");
    			add_location(button, file$2, 115, 4, 2271);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[12], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(115:2) {#if !lastCard}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let label;
    	let input;
    	let t0;
    	let button;
    	let t2;
    	let t3;
    	let label_transition;
    	let current;
    	let dispose;
    	let if_block0 = !/*firstCard*/ ctx[2] && create_if_block_1(ctx);
    	let if_block1 = !/*lastCard*/ ctx[3] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "x";
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(input, "id", /*id*/ ctx[1]);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Insert task...");
    			attr_dev(input, "class", "svelte-1iu8fh3");
    			toggle_class(input, "taskJustAdded", /*taskJustAdded*/ ctx[4]);
    			add_location(input, file$2, 87, 2, 1704);
    			attr_dev(button, "id", "btnClose");
    			attr_dev(button, "class", "svelte-1iu8fh3");
    			add_location(button, file$2, 97, 2, 1930);
    			attr_dev(label, "class", "svelte-1iu8fh3");
    			add_location(label, file$2, 81, 0, 1562);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			set_input_value(input, /*value*/ ctx[0]);
    			/*input_binding*/ ctx[8](input);
    			append_dev(label, t0);
    			append_dev(label, button);
    			append_dev(label, t2);
    			if (if_block0) if_block0.m(label, null);
    			append_dev(label, t3);
    			if (if_block1) if_block1.m(label, null);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    				listen_dev(input, "blur", /*blur_handler*/ ctx[9], false, false, false),
    				listen_dev(button, "click", /*click_handler*/ ctx[10], false, false, false),
    				listen_dev(label, "introend", /*introend_handler*/ ctx[13], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*id*/ 2) {
    				attr_dev(input, "id", /*id*/ ctx[1]);
    			}

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			if (dirty & /*taskJustAdded*/ 16) {
    				toggle_class(input, "taskJustAdded", /*taskJustAdded*/ ctx[4]);
    			}

    			if (!/*firstCard*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(label, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!/*lastCard*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(label, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!label_transition) label_transition = create_bidirectional_transition(label, slide, {}, true);
    				label_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!label_transition) label_transition = create_bidirectional_transition(label, slide, {}, false);
    			label_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			/*input_binding*/ ctx[8](null);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching && label_transition) label_transition.end();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { id } = $$props;
    	let { value = "New Task" } = $$props;
    	let { firstCard = false } = $$props;
    	let { lastCard = false } = $$props;
    	let taskJustAdded = false;
    	let thisInput;

    	onMount(() => {
    		thisInput.focus();
    	});

    	const writable_props = ["id", "value", "firstCard", "lastCard"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Task> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Task", $$slots, []);

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, thisInput = $$value);
    		});
    	}

    	const blur_handler = () => {
    		dispatch("blurred", { value, id });
    	};

    	const click_handler = () => {
    		dispatch("deleteTask", id);
    	};

    	const click_handler_1 = () => {
    		dispatch("moveLeft", { value, id });
    	};

    	const click_handler_2 = () => {
    		dispatch("moveRight", { value, id });
    	};

    	const introend_handler = () => {
    		$$invalidate(4, taskJustAdded = true);

    		setTimeout(
    			() => {
    				$$invalidate(4, taskJustAdded = false);
    			},
    			400
    		);
    	};

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("firstCard" in $$props) $$invalidate(2, firstCard = $$props.firstCard);
    		if ("lastCard" in $$props) $$invalidate(3, lastCard = $$props.lastCard);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onMount,
    		slide,
    		dispatch,
    		id,
    		value,
    		firstCard,
    		lastCard,
    		taskJustAdded,
    		thisInput
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(1, id = $$props.id);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("firstCard" in $$props) $$invalidate(2, firstCard = $$props.firstCard);
    		if ("lastCard" in $$props) $$invalidate(3, lastCard = $$props.lastCard);
    		if ("taskJustAdded" in $$props) $$invalidate(4, taskJustAdded = $$props.taskJustAdded);
    		if ("thisInput" in $$props) $$invalidate(5, thisInput = $$props.thisInput);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value,
    		id,
    		firstCard,
    		lastCard,
    		taskJustAdded,
    		thisInput,
    		dispatch,
    		input_input_handler,
    		input_binding,
    		blur_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		introend_handler
    	];
    }

    class Task extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			id: 1,
    			value: 0,
    			firstCard: 2,
    			lastCard: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Task",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[1] === undefined && !("id" in props)) {
    			console.warn("<Task> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get firstCard() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set firstCard(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lastCard() {
    		throw new Error("<Task>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastCard(value) {
    		throw new Error("<Task>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Layout\Flex.svelte generated by Svelte v3.20.1 */

    const file$3 = "src\\Layout\\Flex.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "svelte-x4pzk4");
    			toggle_class(div, "column", /*direction*/ ctx[2] === "column");
    			toggle_class(div, "space-between", /*justify*/ ctx[0] === "space-between");
    			toggle_class(div, "start", /*align*/ ctx[1] === "start");
    			toggle_class(div, "center", /*align*/ ctx[1] === "center");
    			toggle_class(div, "end", /*align*/ ctx[1] === "end");
    			toggle_class(div, "noWrap", /*noWrap*/ ctx[3]);
    			add_location(div, file$3, 35, 0, 572);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[4], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null));
    				}
    			}

    			if (dirty & /*direction*/ 4) {
    				toggle_class(div, "column", /*direction*/ ctx[2] === "column");
    			}

    			if (dirty & /*justify*/ 1) {
    				toggle_class(div, "space-between", /*justify*/ ctx[0] === "space-between");
    			}

    			if (dirty & /*align*/ 2) {
    				toggle_class(div, "start", /*align*/ ctx[1] === "start");
    			}

    			if (dirty & /*align*/ 2) {
    				toggle_class(div, "center", /*align*/ ctx[1] === "center");
    			}

    			if (dirty & /*align*/ 2) {
    				toggle_class(div, "end", /*align*/ ctx[1] === "end");
    			}

    			if (dirty & /*noWrap*/ 8) {
    				toggle_class(div, "noWrap", /*noWrap*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { justify = "left" } = $$props;
    	let { align = "baseline" } = $$props;
    	let { direction = "row" } = $$props;
    	let { noWrap = false } = $$props;
    	const writable_props = ["justify", "align", "direction", "noWrap"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Flex> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Flex", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("justify" in $$props) $$invalidate(0, justify = $$props.justify);
    		if ("align" in $$props) $$invalidate(1, align = $$props.align);
    		if ("direction" in $$props) $$invalidate(2, direction = $$props.direction);
    		if ("noWrap" in $$props) $$invalidate(3, noWrap = $$props.noWrap);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ justify, align, direction, noWrap });

    	$$self.$inject_state = $$props => {
    		if ("justify" in $$props) $$invalidate(0, justify = $$props.justify);
    		if ("align" in $$props) $$invalidate(1, align = $$props.align);
    		if ("direction" in $$props) $$invalidate(2, direction = $$props.direction);
    		if ("noWrap" in $$props) $$invalidate(3, noWrap = $$props.noWrap);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [justify, align, direction, noWrap, $$scope, $$slots];
    }

    class Flex extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			justify: 0,
    			align: 1,
    			direction: 2,
    			noWrap: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Flex",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get justify() {
    		throw new Error("<Flex>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set justify(value) {
    		throw new Error("<Flex>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get align() {
    		throw new Error("<Flex>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set align(value) {
    		throw new Error("<Flex>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get direction() {
    		throw new Error("<Flex>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set direction(value) {
    		throw new Error("<Flex>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get noWrap() {
    		throw new Error("<Flex>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set noWrap(value) {
    		throw new Error("<Flex>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src\Sections\Kanban.svelte generated by Svelte v3.20.1 */
    const file$4 = "src\\Sections\\Kanban.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[25] = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	child_ctx[22] = i;
    	return child_ctx;
    }

    // (223:2) {:else}
    function create_else_block(ctx) {
    	let section;
    	let h3;
    	let t1;
    	let p;
    	let t3;
    	let div;

    	const block = {
    		c: function create() {
    			section = element("section");
    			h3 = element("h3");
    			h3.textContent = "Your board is empty";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Start adding lists with this button!";
    			t3 = space();
    			div = element("div");
    			div.textContent = "→";
    			attr_dev(h3, "class", "svelte-1y6vt5b");
    			add_location(h3, file$4, 224, 6, 5846);
    			add_location(p, file$4, 225, 6, 5882);
    			attr_dev(div, "id", "arrow");
    			attr_dev(div, "class", "svelte-1y6vt5b");
    			add_location(div, file$4, 226, 6, 5933);
    			add_location(section, file$4, 223, 4, 5829);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, h3);
    			append_dev(section, t1);
    			append_dev(section, p);
    			append_dev(section, t3);
    			append_dev(section, div);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(223:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (207:8) {#each card.tasks as task, t (task.id)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let updating_value;
    	let current;

    	function task_value_binding(value) {
    		/*task_value_binding*/ ctx[17].call(null, value, /*i*/ ctx[22], /*t*/ ctx[25]);
    	}

    	let task_props = {
    		id: "t_" + /*task*/ ctx[23].id,
    		firstCard: /*i*/ ctx[22] === 0 || /*kanbanBoard*/ ctx[4][/*i*/ ctx[22]].tasks[/*t*/ ctx[25]].value == "",
    		lastCard: /*i*/ ctx[22] === /*kanbanBoard*/ ctx[4].length - 1 || /*kanbanBoard*/ ctx[4][/*i*/ ctx[22]].tasks[/*t*/ ctx[25]].value == ""
    	};

    	if (/*kanbanBoard*/ ctx[4][/*i*/ ctx[22]].tasks[/*t*/ ctx[25]].value !== void 0) {
    		task_props.value = /*kanbanBoard*/ ctx[4][/*i*/ ctx[22]].tasks[/*t*/ ctx[25]].value;
    	}

    	const task = new Task({ props: task_props, $$inline: true });
    	binding_callbacks.push(() => bind(task, "value", task_value_binding));
    	task.$on("deleteTask", /*deleteTask*/ ctx[9]);
    	task.$on("moveLeft", /*moveTaskLeft*/ ctx[10]);
    	task.$on("moveRight", /*moveTaskRight*/ ctx[11]);
    	task.$on("blurred", /*taskBlurred*/ ctx[12]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(task.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(task, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const task_changes = {};
    			if (dirty & /*kanbanBoard*/ 16) task_changes.id = "t_" + /*task*/ ctx[23].id;
    			if (dirty & /*kanbanBoard*/ 16) task_changes.firstCard = /*i*/ ctx[22] === 0 || /*kanbanBoard*/ ctx[4][/*i*/ ctx[22]].tasks[/*t*/ ctx[25]].value == "";
    			if (dirty & /*kanbanBoard*/ 16) task_changes.lastCard = /*i*/ ctx[22] === /*kanbanBoard*/ ctx[4].length - 1 || /*kanbanBoard*/ ctx[4][/*i*/ ctx[22]].tasks[/*t*/ ctx[25]].value == "";

    			if (!updating_value && dirty & /*kanbanBoard*/ 16) {
    				updating_value = true;
    				task_changes.value = /*kanbanBoard*/ ctx[4][/*i*/ ctx[22]].tasks[/*t*/ ctx[25]].value;
    				add_flush_callback(() => updating_value = false);
    			}

    			task.$set(task_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(task.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(task.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(task, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(207:8) {#each card.tasks as task, t (task.id)}",
    		ctx
    	});

    	return block;
    }

    // (218:8) <Flex>
    function create_default_slot_3(ctx) {
    	let button;
    	let t;
    	let button_id_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("+");
    			attr_dev(button, "id", button_id_value = "addTask_" + /*i*/ ctx[22]);
    			attr_dev(button, "class", "svelte-1y6vt5b");
    			add_location(button, file$4, 218, 10, 5707);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*addTask*/ ctx[8], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*kanbanBoard*/ 16 && button_id_value !== (button_id_value = "addTask_" + /*i*/ ctx[22])) {
    				attr_dev(button, "id", button_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(218:8) <Flex>",
    		ctx
    	});

    	return block;
    }

    // (206:6) <Card id={'c_' + card.id} title={card.name} on:deleteCard={deleteCard}>
    function create_default_slot_2(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t;
    	let current;
    	let each_value_1 = /*card*/ ctx[20].tasks;
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*task*/ ctx[23].id;
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	const flex = new Flex({
    			props: {
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			create_component(flex.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t, anchor);
    			mount_component(flex, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*kanbanBoard, deleteTask, moveTaskLeft, moveTaskRight, taskBlurred*/ 7696) {
    				const each_value_1 = /*card*/ ctx[20].tasks;
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, t.parentNode, outro_and_destroy_block, create_each_block_1, t, get_each_context_1);
    				check_outros();
    			}

    			const flex_changes = {};

    			if (dirty & /*$$scope, kanbanBoard*/ 67108880) {
    				flex_changes.$$scope = { dirty, ctx };
    			}

    			flex.$set(flex_changes);
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(flex.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(flex.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(t);
    			destroy_component(flex, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(206:6) <Card id={'c_' + card.id} title={card.name} on:deleteCard={deleteCard}>",
    		ctx
    	});

    	return block;
    }

    // (204:2) {#each kanbanBoard as card, i (card.id)}
    function create_each_block(key_1, ctx) {
    	let section;
    	let rect;
    	let stop_animation = noop;
    	let current;

    	const card = new Card({
    			props: {
    				id: "c_" + /*card*/ ctx[20].id,
    				title: /*card*/ ctx[20].name,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	card.$on("deleteCard", /*deleteCard*/ ctx[7]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			section = element("section");
    			create_component(card.$$.fragment);
    			add_location(section, file$4, 204, 4, 5059);
    			this.first = section;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			mount_component(card, section, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const card_changes = {};
    			if (dirty & /*kanbanBoard*/ 16) card_changes.id = "c_" + /*card*/ ctx[20].id;
    			if (dirty & /*kanbanBoard*/ 16) card_changes.title = /*card*/ ctx[20].name;

    			if (dirty & /*$$scope, kanbanBoard*/ 67108880) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		r: function measure() {
    			rect = section.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(section);
    			stop_animation();
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(section, rect, flip, { duration: 400 });
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(card);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(204:2) {#each kanbanBoard as card, i (card.id)}",
    		ctx
    	});

    	return block;
    }

    // (230:2) {#if newCardCreated}
    function create_if_block_1$1(ctx) {
    	let current;

    	const card = new Card({
    			props: {
    				id: "newCard",
    				title: /*newCardTitle*/ ctx[2],
    				newCard: true,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(card.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const card_changes = {};
    			if (dirty & /*newCardTitle*/ 4) card_changes.title = /*newCardTitle*/ ctx[2];

    			if (dirty & /*$$scope, newCardTitle, newCardInput*/ 67108876) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(card, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(230:2) {#if newCardCreated}",
    		ctx
    	});

    	return block;
    }

    // (231:4) <Card id="newCard" title={newCardTitle} newCard={true}>
    function create_default_slot_1(ctx) {
    	let input;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Insert list name...");
    			attr_dev(input, "class", "svelte-1y6vt5b");
    			add_location(input, file$4, 231, 6, 6076);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*newCardTitle*/ ctx[2]);
    			/*input_binding*/ ctx[19](input);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[18]),
    				listen_dev(input, "blur", /*newCardAdded*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*newCardTitle*/ 4 && input.value !== /*newCardTitle*/ ctx[2]) {
    				set_input_value(input, /*newCardTitle*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[19](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(231:4) <Card id=\\\"newCard\\\" title={newCardTitle} newCard={true}>",
    		ctx
    	});

    	return block;
    }

    // (240:2) {#if !hideAddCardBtn}
    function create_if_block$1(ctx) {
    	let section;
    	let button;
    	let section_intro;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			button = element("button");
    			button.textContent = "+";
    			attr_dev(button, "class", "newCard svelte-1y6vt5b");
    			add_location(button, file$4, 241, 6, 6328);
    			add_location(section, file$4, 240, 4, 6303);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, section, anchor);
    			append_dev(section, button);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*addCard*/ ctx[5], false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (!section_intro) {
    				add_render_callback(() => {
    					section_intro = create_in_transition(section, fade, {});
    					section_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(240:2) {#if !hideAddCardBtn}",
    		ctx
    	});

    	return block;
    }

    // (203:0) <Flex noWrap={true} align={'start'}>
    function create_default_slot(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let t1;
    	let if_block1_anchor;
    	let current;
    	let each_value = /*kanbanBoard*/ ctx[4];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*card*/ ctx[20].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block(ctx);
    	}

    	let if_block0 = /*newCardCreated*/ ctx[0] && create_if_block_1$1(ctx);
    	let if_block1 = !/*hideAddCardBtn*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			if (each_1_else) {
    				each_1_else.m(target, anchor);
    			}

    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*kanbanBoard, deleteCard, addTask, deleteTask, moveTaskLeft, moveTaskRight, taskBlurred*/ 8080) {
    				const each_value = /*kanbanBoard*/ ctx[4];
    				validate_each_argument(each_value);
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, t0.parentNode, fix_and_outro_and_destroy_block, create_each_block, t0, get_each_context);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();

    				if (each_value.length) {
    					if (each_1_else) {
    						each_1_else.d(1);
    						each_1_else = null;
    					}
    				} else if (!each_1_else) {
    					each_1_else = create_else_block(ctx);
    					each_1_else.c();
    					each_1_else.m(t0.parentNode, t0);
    				}
    			}

    			if (/*newCardCreated*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t1.parentNode, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!/*hideAddCardBtn*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (each_1_else) each_1_else.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(203:0) <Flex noWrap={true} align={'start'}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let current;

    	const flex = new Flex({
    			props: {
    				noWrap: true,
    				align: "start",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(flex.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(flex, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const flex_changes = {};

    			if (dirty & /*$$scope, hideAddCardBtn, newCardTitle, newCardInput, newCardCreated, kanbanBoard*/ 67108895) {
    				flex_changes.$$scope = { dirty, ctx };
    			}

    			flex.$set(flex_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(flex.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(flex.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(flex, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function maxValue(arr) {
    	let max = arr[0];

    	for (let val of arr) {
    		if (val > max) {
    			max = val;
    		}
    	}

    	return max;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let newCardCreated = false;
    	let hideAddCardBtn = false;
    	let newCardTitle = "";
    	let newCardInput;

    	let kanbanBoard = [
    		{
    			id: 0,
    			name: "To Do",
    			tasks: [{ id: 0, value: "Task 2" }, { id: 1, value: "Task 3" }]
    		},
    		{
    			id: 1,
    			name: "Doing",
    			tasks: [{ id: 2, value: "Task 1" }]
    		},
    		{ id: 2, name: "Testing", tasks: [] },
    		{ id: 3, name: "Done", tasks: [] }
    	];

    	// -------------- //
    	// Card functions //
    	// -------------- //
    	function cardIsNotEmpty(cardInd) {
    		if (!(kanbanBoard[cardInd].tasks.slice(-1) == "") || kanbanBoard[cardInd].tasks.length === 0) {
    			return true;
    		} else {
    			return false;
    		}
    	}

    	function addCard() {
    		$$invalidate(0, newCardCreated = true);
    		$$invalidate(1, hideAddCardBtn = true);

    		(async () => {
    			await tick();
    			newCardInput.focus();
    		})();
    	}

    	function newCardAdded(e) {
    		$$invalidate(2, newCardTitle = "");
    		$$invalidate(0, newCardCreated = false);
    		$$invalidate(1, hideAddCardBtn = false);
    		const newCardId = findIdForNewCard();
    		const newTaskId = findIdForNewTask();

    		if (e.target.value != "") {
    			kanbanBoard.push({
    				id: newCardId,
    				name: e.target.value,
    				tasks: [{ id: newTaskId, value: "" }]
    			});

    			$$invalidate(4, kanbanBoard);
    		}
    	}

    	function deleteCard(e) {
    		$$invalidate(1, hideAddCardBtn = true);
    		const cardId = parseInt(e.detail.slice(2));
    		$$invalidate(4, kanbanBoard = kanbanBoard.filter(c => c.id !== cardId));

    		setTimeout(
    			() => {
    				$$invalidate(1, hideAddCardBtn = false);
    			},
    			400
    		);
    	}

    	function findIdForNewCard() {
    		const cardIDs = kanbanBoard.map(o => o.id);
    		const newCardId = maxValue(cardIDs) + 1;
    		return newCardId ? newCardId : 0;
    	}

    	// -------------- //
    	// Task functions //
    	// -------------- //
    	function addTask(e, targetValue = "") {
    		const cardInd = e.target.id.slice(8);
    		const newTaskId = findIdForNewTask();

    		if (cardIsNotEmpty(cardInd)) {
    			kanbanBoard[cardInd].tasks.push({ id: newTaskId, value: targetValue });
    			$$invalidate(4, kanbanBoard);
    		}
    	}

    	function deleteTask(e) {
    		const taskID = parseInt(e.detail.slice(2));
    		const cardIndex = findCardIndexOfTaskID(e.detail);
    		$$invalidate(4, kanbanBoard[cardIndex].tasks = kanbanBoard[cardIndex].tasks.filter(t => t.id !== taskID), kanbanBoard);
    	}

    	function moveTaskLeft(t) {
    		const e = { detail: t.detail.id };
    		deleteTask(e);
    		const taskId = parseInt(t.detail.id.slice(2));
    		const cardIndex = findCardIndexOfTaskID(e.detail);

    		const cardToAdd = {
    			target: { id: "addTask_" + parseInt(cardIndex - 1) }
    		};

    		addTask(cardToAdd, t.detail.value);
    	}

    	function moveTaskRight(t) {
    		const e = { detail: t.detail.id };
    		deleteTask(e);
    		const taskId = parseInt(t.detail.id.slice(2));
    		const cardIndex = findCardIndexOfTaskID(e.detail);

    		const cardToAdd = {
    			target: { id: "addTask_" + parseInt(cardIndex + 1) }
    		};

    		addTask(cardToAdd, t.detail.value);
    	}

    	function taskBlurred(t) {
    		const e = { detail: t.detail.id };
    		t.detail.value === "" ? deleteTask(e) : "";
    	}

    	function findIdForNewTask() {
    		let taskIDsArray = [];
    		let taskIDs = [];

    		kanbanBoard.forEach(b => {
    			taskIDs = b.tasks.map(t => t.id);
    			taskIDsArray = [...taskIDsArray, taskIDs];
    		});

    		const newTaskId = maxValue(taskIDsArray.flat()) + 1;
    		return newTaskId ? newTaskId : 0;
    	}

    	function findCardIndexOfTaskID(taskID) {
    		const cardID = parseInt(document.getElementById(taskID).parentNode.parentNode.id.slice(2));
    		return kanbanBoard.findIndex(b => b.id === cardID);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Kanban> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Kanban", $$slots, []);

    	function task_value_binding(value, i, t) {
    		kanbanBoard[i].tasks[t].value = value;
    		$$invalidate(4, kanbanBoard);
    	}

    	function input_input_handler() {
    		newCardTitle = this.value;
    		$$invalidate(2, newCardTitle);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, newCardInput = $$value);
    		});
    	}

    	$$self.$capture_state = () => ({
    		Card,
    		Task,
    		Flex,
    		flip,
    		fade,
    		tick,
    		newCardCreated,
    		hideAddCardBtn,
    		newCardTitle,
    		newCardInput,
    		kanbanBoard,
    		cardIsNotEmpty,
    		addCard,
    		newCardAdded,
    		deleteCard,
    		findIdForNewCard,
    		addTask,
    		deleteTask,
    		moveTaskLeft,
    		moveTaskRight,
    		taskBlurred,
    		findIdForNewTask,
    		findCardIndexOfTaskID,
    		maxValue
    	});

    	$$self.$inject_state = $$props => {
    		if ("newCardCreated" in $$props) $$invalidate(0, newCardCreated = $$props.newCardCreated);
    		if ("hideAddCardBtn" in $$props) $$invalidate(1, hideAddCardBtn = $$props.hideAddCardBtn);
    		if ("newCardTitle" in $$props) $$invalidate(2, newCardTitle = $$props.newCardTitle);
    		if ("newCardInput" in $$props) $$invalidate(3, newCardInput = $$props.newCardInput);
    		if ("kanbanBoard" in $$props) $$invalidate(4, kanbanBoard = $$props.kanbanBoard);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		newCardCreated,
    		hideAddCardBtn,
    		newCardTitle,
    		newCardInput,
    		kanbanBoard,
    		addCard,
    		newCardAdded,
    		deleteCard,
    		addTask,
    		deleteTask,
    		moveTaskLeft,
    		moveTaskRight,
    		taskBlurred,
    		cardIsNotEmpty,
    		findIdForNewCard,
    		findIdForNewTask,
    		findCardIndexOfTaskID,
    		task_value_binding,
    		input_input_handler,
    		input_binding
    	];
    }

    class Kanban extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Kanban",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.20.1 */
    const file$5 = "src\\App.svelte";

    function create_fragment$5(ctx) {
    	let t;
    	let main;
    	let current;
    	const navbar = new Navbar({ $$inline: true });
    	const kanban = new Kanban({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(navbar.$$.fragment);
    			t = space();
    			main = element("main");
    			create_component(kanban.$$.fragment);
    			attr_dev(main, "class", "svelte-1ue2xpb");
    			add_location(main, file$5, 13, 0, 193);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(kanban, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(kanban.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(kanban.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navbar, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(main);
    			destroy_component(kanban);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ Navbar, Kanban });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
