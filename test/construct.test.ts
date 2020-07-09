import { Construct, ConstructOrder, ValidationError, DependencyGroup, Dependable, ConstructScopeSettings } from '../src';
import { App as Root } from './util';

// tslint:disable:variable-name
// tslint:disable:max-line-length

test('the "Root" construct is a special construct which can be used as the root of the tree', () => {
  const root = new Root();
  const node = root.node;
  expect(node.id).toBe('');
  expect(node.scope).toBeUndefined();
  expect(node.children.length).toBe(0);
});

test('an empty string is a valid name for a construct', () => {
  const root = new Root();
  const child = new Construct(root, '');
  const grandchild = new Construct(child, '');
  const grandgrand = new Construct(grandchild, 'hello');

  // fail if another child with an empty id is added
  expect(() => new Construct(root, '')).toThrow(/There is already/);

  // cannot add a named child to a parent that already has an unnamed child
  expect(() => new Construct(root, 'hi-there')).toThrow('only a single construct is allowed');
  expect(() => new Construct(child, 'boom')).toThrow('only a single construct is allowed');

  // cannot add an unnamed child to a parent with a named child
  expect(() => new Construct(grandgrand, '')).toThrow(/cannot add a nameless construct/);

  expect(root.node.path).toStrictEqual('');
  expect(child.node.path).toStrictEqual('');
  expect(grandchild.node.path).toStrictEqual('');
  expect(grandgrand.node.path).toStrictEqual('hello');

  // unique id cannot be calculated on a path that only includes empty names
  expect(() => root.node.uniqueId).toThrow(/Unable to calculate/);
  expect(() => child.node.uniqueId).toThrow(/Unable to calculate/);
  expect(() => grandchild.node.uniqueId).toThrow(/Unable to calculate/);
})

test('construct.name returns the name of the construct', () => {
  const t = createTree();

  expect(t.child1.node.id).toBe('Child1');
  expect(t.child2.node.id).toBe('Child2');
  expect(t.child1_1.node.id).toBe('Child11');
  expect(t.child1_2.node.id).toBe('Child12');
  expect(t.child1_1_1.node.id).toBe('Child111');
  expect(t.child2_1.node.id).toBe('Child21');

});

test('construct id can use any character except the path separator', () => {
  const root = new Root();
  expect(() => new Construct(root, 'valid')).not.toThrow();
  expect(() => new Construct(root, 'ValiD')).not.toThrow();
  expect(() => new Construct(root, 'Va123lid')).not.toThrow();
  expect(() => new Construct(root, 'v')).not.toThrow();
  expect(() => new Construct(root, '  invalid' )).not.toThrow();
  expect(() => new Construct(root, 'invalid   ' )).not.toThrow();
  expect(() => new Construct(root, '123invalid' )).not.toThrow();
  expect(() => new Construct(root, 'in valid' )).not.toThrow();
  expect(() => new Construct(root, 'in_Valid' )).not.toThrow();
  expect(() => new Construct(root, 'in-Valid' )).not.toThrow();
  expect(() => new Construct(root, 'in\\Valid' )).not.toThrow();
  expect(() => new Construct(root, 'in.Valid' )).not.toThrow();
});

test('if construct id contains path seperators, they will be replaced by double-dash', () => {
  const root = new Root();
  const c = new Construct(root, 'Boom/Boom/Bam');
  expect(c.node.id).toBe('Boom--Boom--Bam');
});

test('if "undefined" is forcefully used as an "id", it will be treated as an empty string', () => {
  const c = new Construct(undefined as any, undefined as any);
  expect(c.node.id).toBe('');
});

test('construct.uniqueId returns a tree-unique alphanumeric id of this construct', () => {
  const root = new Root();

  const child1 = new Construct(root, 'This is the first child');
  const child2 = new Construct(child1, 'Second level');
  const c1 = new Construct(child2, 'My construct');
  const c2 = new Construct(child1, 'My construct');

  expect(c1.node.path).toBe('This is the first child/Second level/My construct');
  expect(c2.node.path).toBe('This is the first child/My construct');
  expect(c1.node.uniqueId).toBe('ThisisthefirstchildSecondlevelMyconstruct202131E0');
  expect(c2.node.uniqueId).toBe('ThisisthefirstchildMyconstruct8C288DF9');
});

test('cannot calculate uniqueId if the construct path is ["Default"]', () => {
  const root = new Root();
  const c = new Construct(root, 'Default');
  expect(() => c.node.uniqueId).toThrow(/Unable to calculate a unique id for an empty set of components/);
});

test('construct.getChildren() returns an array of all children', () => {
  const root = new Root();
  const child = new Construct(root, 'Child1');
  new Construct(root, 'Child2');
  expect(child.node.children.length).toBe(0);
  expect(root.node.children.length).toBe(2);
});

test('construct.findChild(name) can be used to retrieve a child from a parent', () => {
  const root = new Root();
  const child = new Construct(root, 'Contruct');
  expect(root.node.tryFindChild(child.node.id)).toBe(child);
  expect(root.node.tryFindChild('NotFound')).toBeUndefined();
});

test('construct.getChild(name) can be used to retrieve a child from a parent', () => {
  const root = new Root();
  const child = new Construct(root, 'Contruct');
  expect(root.node.findChild(child.node.id)).toBe(child);
  expect(() => root.node.findChild('NotFound')).toThrow(/No child with id: 'NotFound'/);
});

test('construct.getContext(key) can be used to read a value from context defined at the root level', () => {
  const context = {
    ctx1: 12,
    ctx2: 'hello',
  };

  const t = createTree(context);
  expect(t.child1_2.node.tryGetContext('ctx1')).toBe(12);
  expect(t.child1_1_1.node.tryGetContext('ctx2')).toBe('hello');
});

// tslint:disable-next-line:max-line-length
test('construct.setContext(k,v) sets context at some level and construct.getContext(key) will return the lowermost value defined in the stack', () => {
  const root = new Root();
  const highChild = new Construct(root, 'highChild');
  highChild.node.setContext('c1', 'root');
  highChild.node.setContext('c2', 'root');

  const child1 = new Construct(highChild, 'child1');
  child1.node.setContext('c2', 'child1');
  child1.node.setContext('c3', 'child1');

  const child2 = new Construct(highChild, 'child2');
  const child3 = new Construct(child1, 'child1child1');
  child3.node.setContext('c1', 'child3');
  child3.node.setContext('c4', 'child3');

  expect(highChild.node.tryGetContext('c1')).toBe('root');
  expect(highChild.node.tryGetContext('c2')).toBe('root');
  expect(highChild.node.tryGetContext('c3')).toBeUndefined();

  expect(child1.node.tryGetContext('c1')).toBe('root');
  expect(child1.node.tryGetContext('c2')).toBe('child1');
  expect(child1.node.tryGetContext('c3')).toBe('child1');

  expect(child2.node.tryGetContext('c1')).toBe('root');
  expect(child2.node.tryGetContext('c2')).toBe('root');
  expect(child2.node.tryGetContext('c3')).toBeUndefined();

  expect(child3.node.tryGetContext('c1')).toBe('child3');
  expect(child3.node.tryGetContext('c2')).toBe('child1');
  expect(child3.node.tryGetContext('c3')).toBe('child1');
  expect(child3.node.tryGetContext('c4')).toBe('child3');

});

test('construct.setContext(key, value) can only be called before adding any children', () => {
  const root = new Root();
  new Construct(root, 'child1');
  expect(() => root.node.setContext('k', 'v')).toThrow(/Cannot set context after children have been added: child1/);
});

test('construct.pathParts returns an array of strings of all names from root to node', () => {
  const tree = createTree();
  expect(tree.root.node.path).toBe('');
  expect(tree.child1_1_1.node.path).toBe('HighChild/Child1/Child11/Child111');
  expect(tree.child2.node.path).toBe('HighChild/Child2');
});

test('if a root construct has a name, it should be included in the path', () => {
  const tree = createTree({});
  expect(tree.root.node.path).toBe('');
  expect(tree.child1_1_1.node.path).toBe('HighChild/Child1/Child11/Child111');
});

test('construct can not be created with the name of a sibling', () => {
  const root = new Root();

  // WHEN
  new Construct(root, 'SameName');

  // THEN: They have different paths
  expect(() => new Construct(root, 'SameName')).toThrow(/There is already a Construct with name 'SameName' in App/);

  // WHEN
  const c0 = new Construct(root, 'c0');
  new Construct(c0, 'SameName');

  // THEN: They have different paths
  expect(() => new Construct(c0, 'SameName')).toThrow(/There is already a Construct with name 'SameName' in Construct \[c0\]/);
});

test('addMetadata(type, data) can be used to attach metadata to constructs', () => {
  const root = new Root();
  const con = new Construct(root, 'MyConstruct');
  expect(con.node.metadata).toEqual([]);

  const node = con.node;
  (function FIND_ME() { // <-- Creates a stack trace marker we'll be able to look for
    node.addMetadata('key', 'value', { stackTrace: true });
    node.addMetadata('number', 103);
    node.addMetadata('array', [123, 456]);
  })();

  expect(node.metadata[0].type).toBe('key');
  expect(node.metadata[0].data).toBe('value');
  expect(node.metadata[1].data).toBe(103);
  expect(node.metadata[2].data).toEqual([ 123, 456 ]);

  expect(node.metadata[0].trace?.[0]).toContain('FIND_ME');
});

test('addMetadata() respects the "stackTrace" option', () => {
  const root = new Root();
  const con = new Construct(root, 'Foo');
  const con2 = new Construct(root, 'Foo2');

  con.node.addMetadata('foo', 'bar1', { stackTrace: true });
  con.node.addMetadata('foo', 'bar2', { stackTrace: false });

  // disable stack traces only for "con"
  ConstructScopeSettings.of(con).disableStackTraces();
  con.node.addMetadata('foo', 'bar3', { stackTrace: true });
  con2.node.addMetadata('hello', 'world', { stackTrace: true });''

  expect(con.node.metadata.length).toBe(3);
  expect(con.node.metadata[0]?.trace?.length).toBeGreaterThan(0);
  expect(con.node.metadata[1]?.trace).toBeUndefined();
  expect(con.node.metadata[2]?.trace).toBeUndefined();
  expect(con2.node.metadata[0]?.trace?.length).toBeGreaterThan(0);
});

test('addMetadata(type, undefined/null) is ignored', () => {
  const root = new Root();
  const con = new Construct(root, 'Foo');
  const node = con.node;
  node.addMetadata('Null', null);
  node.addMetadata('Undefined', undefined);
  node.addMetadata('True', true);
  node.addMetadata('False', false);
  node.addMetadata('Empty', '');

  const exists = (key: string) => node.metadata.find(x => x.type === key);

  expect(exists('Null')).toBeFalsy();
  expect(exists('Undefined')).toBeFalsy();
  expect(exists('True')).toBeTruthy();
  expect(exists('False')).toBeTruthy();
  expect(exists('Empty')).toBeTruthy();
});

describe('info/warning/error', () => {

  const tests = [
    {
      key: 'info',
      op: (scope: Construct, message: string) => scope.node.addInfo(message),
      overrideKey: (scope: Construct, newKey: string) => ConstructScopeSettings.of(scope).infoMetadataKey = newKey,
    },
    {
      key: 'warning',
      op: (c: Construct, message: string) => c.node.addWarning(message),
      overrideKey: (scope: Construct, newKey: string) => ConstructScopeSettings.of(scope).warningMetadataKey = newKey,
    },
    {
      key: 'error',
      op: (c: Construct, message: string) => c.node.addError(message),
      overrideKey: (scope: Construct, newKey: string) => ConstructScopeSettings.of(scope).errorMetadataKey = newKey,
    },
  ];

  for (const t of tests) {
    test(`${t.key} - normal operation`, () => {
      const root = new Root();
      const con = new Construct(root, 'MyConstruct');
      const message = 'This is a message 12334';
      t.op(con, message);
      expect(con.node.metadata[0].type).toBe(t.key);
      expect(con.node.metadata[0].data).toBe(message);
      expect(con.node.metadata[0].trace?.length).toBeGreaterThan(0);
    });

    test(`${t.key} - key can be overridden`, () => {
      const root = new Root();
      t.overrideKey(root, 'my-new-key');
      const con = new Construct(root, 'MyConstruct');
      const message = 'This is a message 12334';
      
      t.op(con, message);
      expect(con.node.metadata[0].type).toBe('my-new-key');
      expect(con.node.metadata[0].data).toBe(message);
      expect(con.node.metadata[0].trace?.length).toBeGreaterThan(0);
    });

    test(`${t.key} - stack trace disabled`, () => {
      const root = new Root();
      ConstructScopeSettings.of(root).disableStackTraces();

      const con = new Construct(root, 'MyConstruct');
      const message = 'This is a message 12334';
      t.op(con, message);
      expect(con.node.metadata[0].type).toBe(t.key);
      expect(con.node.metadata[0].data).toBe(message);
      expect(con.node.metadata[0].trace).toBe(undefined);
    });
  }

});

test('multiple children of the same type, with explicit names are welcome', () => {
  const root = new Root();
  new MyBeautifulConstruct(root, 'mbc1');
  new MyBeautifulConstruct(root, 'mbc2');
  new MyBeautifulConstruct(root, 'mbc3');
  new MyBeautifulConstruct(root, 'mbc4');
  expect(root.node.children.length).toBeGreaterThanOrEqual(4);
});

// tslint:disable-next-line:max-line-length
test('construct.validate() can be implemented to perform validation, node.validate() will return all errors from the subtree (DFS)', () => {

  class MyConstruct extends Construct {
    protected validate() {
      return [ 'my-error1', 'my-error2' ];
    }
  }

  class YourConstruct extends Construct {
    protected validate() {
      return [ 'your-error1' ];
    }
  }

  class TheirConstruct extends Construct {
    constructor(scope: Construct, id: string) {
      super(scope, id);

      new YourConstruct(this, 'YourConstruct');
    }

    protected validate() {
      return [ 'their-error' ];
    }
  }

  class TestStack extends Root {
    constructor() {
      super();

      new MyConstruct(this, 'MyConstruct');
      new TheirConstruct(this, 'TheirConstruct');
    }

    protected validate() {
      return  [ 'stack-error' ];
    }
  }

  const stack = new TestStack();

  const validateTree = (root: Construct) => {
    const errors: ValidationError[] = [];
    for (const child of root.node.children) {
      errors.push(...validateTree(child));
    }

    errors.push(...root.node.validate());
    return errors;
  }

  const errors = validateTree(stack)
    .map((v: ValidationError) => ({ path: v.source.node.path, message: v.message }));

  // validate DFS
  expect(errors).toEqual([
    { path: 'MyConstruct', message: 'my-error1' },
    { path: 'MyConstruct', message: 'my-error2' },
    { path: 'TheirConstruct/YourConstruct', message: 'your-error1' },
    { path: 'TheirConstruct', message: 'their-error' },
    { path: '', message: 'stack-error' },
  ]);

});

test('node.validate() returns an empty array if the construct does not implement IValidation', () => {
  // GIVEN
  const root = new Root();

  // THEN
  expect(root.node.validate()).toStrictEqual([]);
});

test('construct.lock() protects against adding children anywhere under this construct (direct or indirect)', () => {

  const stack = new Root();

  const c0a = new Construct(stack, 'c0a');
  const c0b = new Construct(stack, 'c0b');

  const c1a = new Construct(c0a, 'c1a');
  const c1b = new Construct(c0a, 'c1b');

  c0a.node.lock();

  // now we should still be able to add children to c0b, but not to c0a or any its children
  new Construct(c0b, 'c1a');
  expect(() => new Construct(c0a, 'fail1')).toThrow(/Cannot add children to "c0a" during synthesis/);
  expect(() => new Construct(c1a, 'fail2')).toThrow(/Cannot add children to "c0a\/c1a" during synthesis/);
  expect(() => new Construct(c1b, 'fail3')).toThrow(/Cannot add children to "c0a\/c1b" during synthesis/);

  c0a.node.unlock();

  new Construct(c0a, 'c0aZ');
  new Construct(c1a, 'c1aZ');
  new Construct(c1b, 'c1bZ');

  // lock root
  stack.node.lock();
  expect(() => new Construct(stack, 'test')).toThrow(/Cannot add children during synthesis/);
});

test('findAll returns a list of all children in either DFS or BFS', () => {
  // GIVEN
  const c1 = new Construct(undefined as any, '1');
  const c2 = new Construct(c1, '2');
  new Construct(c1, '3');
  new Construct(c2, '4');
  new Construct(c2, '5');

  // THEN
  const node = c1.node;
  expect(node.findAll().map(x => x.node.id)).toEqual(c1.node.findAll(ConstructOrder.PREORDER).map(x => x.node.id)); // default is PreOrder
  expect(node.findAll(ConstructOrder.PREORDER).map(x => x.node.id)).toEqual([ '1', '2', '4', '5', '3' ]);
  expect(node.findAll(ConstructOrder.POSTORDER).map(x => x.node.id)).toEqual([ '4', '5', '2', '3', '1' ]);
});

test('ancestors returns a list of parents up to root', () => {
  const { child1_1_1 } = createTree();
  expect(child1_1_1.node.scopes.map(x => x.node.id)).toEqual([ '', 'HighChild', 'Child1', 'Child11', 'Child111' ]);
});

test('"root" returns the root construct', () => {
  const { child1, child2, child1_1_1, root } = createTree();
  expect(child1.node.root).toBe(root);
  expect(child2.node.root).toBe(root);
  expect(child1_1_1.node.root).toBe(root);
});

describe('defaultChild', () => {
  test('returns the child with id "Resource"', () => {
    const root = new Root();
    new Construct(root, 'child1');
    const defaultChild = new Construct(root, 'Resource');
    new Construct(root, 'child2');

    expect(root.node.defaultChild).toBe(defaultChild);
  });
  test('returns the child with id "Default"', () => {
    const root = new Root();
    new Construct(root, 'child1');
    const defaultChild = new Construct(root, 'Default');
    new Construct(root, 'child2');

    expect(root.node.defaultChild).toBe(defaultChild);
  });
  test('can override defaultChild', () => {
    const root = new Root();
    new Construct(root, 'Resource');
    const defaultChild = new Construct(root, 'OtherResource');
    root.node.defaultChild = defaultChild;

    expect(root.node.defaultChild).toBe(defaultChild);
  });
  test('returns "undefined" if there is no default', () => {
    const root = new Root();
    new Construct(root, 'child1');
    new Construct(root, 'child2');

    expect(root.node.defaultChild).toBeUndefined();
  });
  test('fails if there are both "Resource" and "Default"', () => {
    const root = new Root();
    new Construct(root, 'child1');
    new Construct(root, 'Default');
    new Construct(root, 'child2');
    new Construct(root, 'Resource');

    expect(() => root.node.defaultChild)
      .toThrow(/Cannot determine default child for . There is both a child with id "Resource" and id "Default"/);
  });
});

describe('dependencies', () => {

  test('addDependency() defines a dependency between two scopes', () => {
    // GIVEN
    const root = new Root();
    const consumer = new Construct(root, 'consumer');
    const producer1 = new Construct(root, 'producer1');
    const producer2 = new Construct(root, 'producer2');

    // WHEN
    consumer.node.addDependency(producer1);
    consumer.node.addDependency(producer2);

    // THEN
    expect(consumer.node.dependencies.map(x => x.node.path)).toStrictEqual([ 'producer1', 'producer2' ]);
  });

  test('are deduplicated', () => {
    // GIVEN
    const root = new Root();
    const consumer = new Construct(root, 'consumer');
    const producer = new Construct(root, 'producer');


    // WHEN
    consumer.node.addDependency(producer);
    consumer.node.addDependency(producer);
    consumer.node.addDependency(producer);
    consumer.node.addDependency(producer);

    // THEN
    expect(consumer.node.dependencies.map(x => x.node.path)).toStrictEqual([ 'producer' ]);
  });

  test('DependencyGroup can represent a group of disjoined producers', () => {
    // GIVEN
    const root = new Root();
    const group = new DependencyGroup(new Construct(root, 'producer1'), new Construct(root, 'producer2'));
    const consumer = new Construct(root, 'consumer');

    // WHEN
    group.add(new Construct(root, 'producer3'), new Construct(root, 'producer4'));
    consumer.node.addDependency(group);

    // THEN
    expect(consumer.node.dependencies.map(x => x.node.path)).toStrictEqual([ 'producer1', 'producer2', 'producer3', 'producer4' ]);
  });

  test('Dependable.implement() can be used to implement IDependable on any object', () => {
    // GIVEN
    const root = new Root();
    const producer = new Construct(root, 'producer');
    const consumer = new Construct(root, 'consumer');

    // WHEN
    const foo = { };
    Dependable.implement(foo, {
      get dependencyRoots() { return [ producer ]; },
    });
    consumer.node.addDependency(foo);

    // THEN
    expect(Dependable.of(foo).dependencyRoots.map(x => x.node.path)).toStrictEqual([ 'producer' ]);
    expect(consumer.node.dependencies.map(x => x.node.path)).toStrictEqual([ 'producer' ]);
  });

  test('Dependable.of() throws an error the object does not implement IDependable', () => {
    expect(() => Dependable.of({})).toThrow(/does not implement IDependable/);
  });

});

test('tryRemoveChild()', () => {
  // GIVEN
  const root = new Root();
  new Construct(root, 'child1');
  new Construct(root, 'child2');

  // WHEN
  expect(root.node.children.length).toBe(2);
  expect(root.node.tryRemoveChild('child1')).toBeTruthy();
  expect(root.node.tryRemoveChild('child-not-found')).toBeFalsy();

  // THEN
  expect(root.node.children.length).toBe(1);
});

test('toString()', () => {
  // GIVEN
  const root = new Root();
  const child = new Construct(root, 'child');
  const grand = new Construct(child, 'grand');

  // THEN
  expect(root.toString()).toStrictEqual('<root>');
  expect(child.toString()).toStrictEqual('child');
  expect(grand.toString()).toStrictEqual('child/grand');
});

function createTree(context?: any) {
  const root = new Root();
  const highChild = new Construct(root, 'HighChild');
  if (context) {
    Object.keys(context).forEach(key => highChild.node.setContext(key, context[key]));
  }

  const child1 = new Construct(highChild, 'Child1');
  const child2 = new Construct(highChild, 'Child2');
  const child1_1 = new Construct(child1, 'Child11');
  const child1_2 = new Construct(child1, 'Child12');
  const child1_1_1 = new Construct(child1_1, 'Child111');
  const child2_1 = new Construct(child2, 'Child21');

  return {
    root, child1, child2, child1_1, child1_2, child1_1_1, child2_1,
  };
}

class MyBeautifulConstruct extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
}
