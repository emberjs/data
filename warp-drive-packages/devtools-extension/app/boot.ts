import './styles/app.css';

// oxlint does not parse `.gts`, so it cannot see the type of this import. TypeScript does.
import App from './app.gts';

// oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-member-access
App.create({});
